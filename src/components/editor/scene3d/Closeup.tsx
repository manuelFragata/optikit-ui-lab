/**
 * The close-up: one part on its own, in a pane beside the canvas, to look at
 * what it is made of. Its module's components (the cube enclosure, the
 * holder, the lens, the screws) are listed and can be hovered and picked,
 * here or on the main 3D canvas; the picked one is framed and described.
 * To see inside: X-ray (the others faint), Isolate (the picked one alone) and
 * Section (cut away the front, at a depth you choose).
 *
 * It draws the same prepared meshes as the main view (meshes.ts): nothing is
 * loaded twice. Its own canvas has its own renderer, so the section's
 * clipping plane and the faint material touch nothing in the main view.
 */
import { Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import Paper from '@mui/material/Paper';
import Slider from '@mui/material/Slider';
import Stack from '@mui/material/Stack';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import CenterFocusWeakOutlinedIcon from '@mui/icons-material/CenterFocusWeakOutlined';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CloseIcon from '@mui/icons-material/Close';
import ContentCutOutlinedIcon from '@mui/icons-material/ContentCutOutlined';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FitScreenOutlinedIcon from '@mui/icons-material/FitScreenOutlined';
import OpacityOutlinedIcon from '@mui/icons-material/OpacityOutlined';
import { Canvas, useThree, type ThreeEvent } from '@react-three/fiber';
import { CameraControls, Line } from '@react-three/drei';
import CameraControlsImpl from 'camera-controls';
import { Box3, DoubleSide, MeshStandardMaterial, Plane, Quaternion, Sphere, Vector3, type Group } from 'three';
import { holderPart, specLine, type HolderSpec, type ModuleOption, type SchematicSymbol } from '../model';
import { cartridgeDefaults, planCartridge, type BeamAxis, type CartridgeParams } from '../../../standins/service/cartridge';
import { roadsFor, type Road } from '../../../standins/service/generators';
import { useRequest } from '../../../ports/request';
import type { IdealSpec, SnapCandidate } from '../../../ports/service';
import { factsFromInputs, opticFacts, opticShape, type CatalogRecord, type FragmentSurface, type OpticShape } from '../holders/optic';
import { useSceneColors, type SceneColors } from './colors';
import { ROLE_LABEL, SOURCE_LABEL, type ComponentRole } from './components';
import { CUBE_MM, type MeshRef } from './layout3d';
import { COMPONENT_KEY, poseMatrix, useModuleMesh, type MeshComponent, type PreparedMesh } from './meshes';
import { cartridgeComponents, disposeComponents, lensComponent } from './holderMesh';
import { SnapPanel } from './SnapPanel';
import { HolderDesigner, PREVIEWED_ROAD, type HolderDraft } from './HolderDesigner';
import { ComponentMesh, CubeEdges, Glyph, MeshBoundary } from './shapes';
import { surfaceInfo, withCoating } from '../../../standins/kernel/coatings';
import { OpticalView } from '../optics/OpticalView';
import { OpticsPanel } from '../optics/OpticsPanel';

const NO_CANDIDATES = async (): Promise<SnapCandidate[]> => [];

export interface CloseupProps {
  /** The part to look at; `null` until one is picked. */
  part: SchematicSymbol | null;
  /** Its module's mesh, when it has one. */
  mesh?: MeshRef;
  /** The picked component, by key. */
  focus: string | null;
  onFocus: (key: string | null) => void;
  onClose: () => void;
  /** The catalogue record behind a part's name (in the app: the library). */
  opticFor?: (part: SchematicSymbol) => CatalogRecord | undefined;
  /** The empty cube's mesh, for a holder designed here. */
  cubeMesh?: string;
  /** A holder frozen for the part, or a frozen one changed. Without it, parts with no holder are only looked at. */
  onHolder?: (spec: HolderSpec) => void;
  /** The catalogue parts an ideal part could snap to, best first (the service's). */
  candidatesFor?: (spec: IdealSpec) => Promise<SnapCandidate[]>;
  /** An ideal part snapped to a catalogue part. Without it, ideal parts are only looked at. */
  onSnap?: (candidate: SnapCandidate) => void;
  /** The modules the part could be realized as, and realizing it as one. */
  modules?: ModuleOption[];
  onRealize?: (option: ModuleOption) => void;
  /** An ideal part designed as a real optic, from this prescription. */
  onDesign?: (prescription: FragmentSurface[]) => void;
  /** The wavelengths of the design's sources, nm: what the Optical side checks coatings against. */
  wavelengths?: number[];
  /** A designed optic's prescription changed here (its coatings). */
  onPrescription?: (prescription: FragmentSurface[]) => void;
}

/** What the close-up looks at: how the part is made and held, or what it does to the light. */
type Side = 'mechanical' | 'optical';

/** The section's cut, as a share of the cube's half width: 0 through the middle. */
const SECTION_MAX = 1;

/** Turns the document frame (z up) into three.js's (y up), as the main view does. */
const Z_UP: [number, number, number] = [-Math.PI / 2, 0, 0];

/** The beam the checks assume until told otherwise (optikit-v2's fold insert takes 12 mm). */
const DEFAULT_BEAM_MM = 12;

/** Where a holder design starts: the frozen one, else the lens cartridge when it can hold the part, else the first road that can. */
function initialDraft(saved: HolderSpec | undefined, component: string, roads: Road[]): HolderDraft {
  if (saved?.generator === PREVIEWED_ROAD) return { road: saved.generator, params: saved.params as unknown as CartridgeParams, beamMm: DEFAULT_BEAM_MM };
  const open = roads.filter((r) => !r.refusal).map((r) => r.spec.script);
  return { road: open.includes(PREVIEWED_ROAD) ? PREVIEWED_ROAD : (open[0] ?? PREVIEWED_ROAD), params: cartridgeDefaults(component), beamMm: DEFAULT_BEAM_MM };
}

export function Closeup({ part, mesh, focus, onFocus, onClose, opticFor, cubeMesh, onHolder, candidatesFor, onSnap, modules = [], onRealize, onDesign, wavelengths = [], onPrescription }: CloseupProps) {
  const colors = useSceneColors();
  const [hover, setHover] = useState<string | null>(null);
  const [xray, setXray] = useState(false);
  const [isolate, setIsolate] = useState(false);
  const [section, setSection] = useState<number | null>(null);
  const [fitAll, setFitAll] = useState(0);

  // A part with no holder, or a frozen one: designed here.
  const partName = part ? holderPart(part.placement) : undefined;
  const designing = Boolean(part && partName && onHolder);
  const record = part && partName ? opticFor?.(part) : undefined;
  const shape = useMemo(() => (record ? opticShape(record) : null), [record]);
  const facts = record ? opticFacts(record) : part ? factsFromInputs(part.kind, part.inputs?.find((i) => i.label === 'Diameter')?.value) : null;
  const roads = designing && facts ? roadsFor(facts) : [];
  const saved = part?.placement.state === 'in-cube' ? part.placement.holder : undefined;
  // One draft per part, kept while the session lasts.
  const [drafts, setDrafts] = useState<Record<string, HolderDraft>>({});
  const draft = designing && part ? (drafts[part.id] ?? initialDraft(saved, record?.id ?? partName ?? '', roads)) : null;
  const setDraft = (d: HolderDraft) => part && setDrafts((m) => ({ ...m, [part.id]: d }));
  const plan = draft && shape && draft.road === PREVIEWED_ROAD ? planCartridge(draft.params, shape, draft.beamMm) : null;
  const changed = Boolean(draft && saved && (saved.generator !== draft.road || JSON.stringify(saved.params) !== JSON.stringify(draft.params)));
  const preview = designing && part && draft && plan && shape && record && cubeMesh ? { params: draft.params, beamMm: draft.beamMm, shape, record, cubeMesh } : null;
  const clipped = Boolean(plan?.checks.some((c) => c.code === 'DRC_BEAM_CLIPPED' || c.code === 'DRC_APERTURE'));

  // An ideal part: which real part it could be. The one hovered in the list is shown, else the one picked, else the best.
  const ideal = part?.placement.state === 'ideal';
  const inputs = Object.fromEntries((part?.inputs ?? []).map((i) => [i.label, i.value]));
  // The specification asked about, kept while its values stay: the service is asked again only when they change.
  const kind = part?.kind;
  const focalMm = inputs['Focal length'];
  const diameterMm = inputs.Diameter;
  const spec = useMemo<IdealSpec | null>(() => (ideal && kind ? { kind, focalMm, diameterMm } : null), [ideal, kind, focalMm, diameterMm]);
  const candidatesRequest = useRequest(candidatesFor ? spec : null, candidatesFor ?? NO_CANDIDATES);
  const candidates = candidatesRequest.data ?? [];
  const [snapShown, setSnapShown] = useState<string | null>(null);
  const [snapPicked, setSnapPicked] = useState<{ part: string; id: string } | null>(null);
  const picked = part && snapPicked?.part === part.id ? snapPicked.id : null;
  // Picked (clicked), else the best: what Snap takes. Shown: the hovered one, else the picked.
  const chosen = candidates.find((c) => c.record.id === picked) ?? candidates[0];
  const candidate = candidates.find((c) => c.record.id === snapShown) ?? chosen;
  const candidateShape = useMemo(() => (candidate ? opticShape(candidate.record) : null), [candidate]);

  // The components, once the mesh has loaded or the holder is built (inside the canvas, so they report back).
  const source = preview && part ? `holder ${part.id}` : mesh?.url;
  const [loaded, setLoaded] = useState<{ source: string; mesh: PreparedMesh } | null>(null);
  const components = source && loaded?.source === source ? loaded.mesh.components : [];
  const focused = components.find((c) => c.info.key === focus);
  const shown = components.find((c) => c.info.key === hover) ?? focused;

  // The Optical side: any part whose glass is known (designed here, or a catalogue part), whatever holds it.
  const [side, setSide] = useState<Side>('mechanical');
  const optic = part ? opticFor?.(part) : undefined;
  const opticalShape = useMemo(() => (optic ? opticShape(optic) : null), [optic]);
  const infos = useMemo(() => (optic && opticalShape ? surfaceInfo(optic) : []), [optic, opticalShape]);
  const optical = side === 'optical' && infos.length > 0;
  const [surface, setSurface] = useState(0);
  const [surfaceHover, setSurfaceHover] = useState<number | null>(null);
  const opticRef = useRef<Group>(null);

  // Another part: start from the whole of it again.
  useEffect(() => {
    setHover(null);
    setSurface(0);
    setSurfaceHover(null);
  }, [part?.id]);

  const view = { colors, focus, hover, xray, isolate, section, fitAll, onHover: setHover, onFocus };
  const module = part?.placement.state === 'in-cube' ? part.placement.module : undefined;
  const subtitle = module ?? (partName ? `${partName} · not mounted yet` : ideal && part ? `Ideal ${part.kind} · ${specLine(part) || 'no part chosen'}` : undefined);
  const tools = optical ? (
    <ToolButton label="Fit the optic" onClick={() => setFitAll((n) => n + 1)} icon={<FitScreenOutlinedIcon fontSize="small" />} />
  ) : (
    <>
      <ToolButton label="X-ray: the others faint" on={xray} disabled={!focused} onClick={() => setXray(!xray)} icon={<OpacityOutlinedIcon fontSize="small" />} />
      <ToolButton label="Isolate: the picked one alone" on={isolate} disabled={!focused} onClick={() => setIsolate(!isolate)} icon={<CenterFocusWeakOutlinedIcon fontSize="small" />} />
      <ToolButton label="Section: cut away the front" on={section !== null} disabled={!components.length} onClick={() => setSection(section === null ? 0 : null)} icon={<ContentCutOutlinedIcon fontSize="small" />} />
      <ToolButton label="Fit the part" onClick={() => (focus ? onFocus(null) : setFitAll((n) => n + 1))} disabled={!part} icon={<FitScreenOutlinedIcon fontSize="small" />} />
    </>
  );

  return (
    <Box sx={{ position: 'relative', display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, bgcolor: 'canvas.ground' }}>
      <Stack
        direction="row"
        sx={(t) => ({ alignItems: 'center', gap: 0.5, minHeight: t.spacing(t.layout.panelHeaderHeight), pl: 2, pr: 0.5, bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' })}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle2" noWrap>
            {part ? `Close-up · ${part.label}` : 'Close-up'}
          </Typography>
          {subtitle && subtitle !== part?.label && (
            <Typography variant="caption" color="text.secondary" noWrap component="div" sx={{ lineHeight: 1.2 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        {part && (
          <ToggleButtonGroup exclusive size="small" value={optical ? 'optical' : 'mechanical'} onChange={(_, v: Side | null) => v && setSide(v)} aria-label="Look at" sx={{ mr: 0.5 }}>
            <ToggleButton value="mechanical" sx={{ textTransform: 'none', py: 0.25, px: 1.25 }}>
              Mechanical
            </ToggleButton>
            <Tooltip title={infos.length ? 'What it does to the light: surfaces and coatings' : part.placement.state === 'ideal' ? 'An ideal part has no glass yet: design it or snap it to a catalogue part' : 'No prescription known for this part'}>
              <span>
                <ToggleButton value="optical" disabled={!infos.length} sx={{ textTransform: 'none', py: 0.25, px: 1.25, borderTopLeftRadius: 0, borderBottomLeftRadius: 0, ml: '-1px' }}>
                  Optical
                </ToggleButton>
              </span>
            </Tooltip>
          </ToggleButtonGroup>
        )}
        {tools}
        <Tooltip title="Close the close-up">
          <IconButton aria-label="Close the close-up" onClick={onClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>

      <Box sx={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <Box sx={{ position: 'relative', flex: 1, minWidth: 0, cursor: (optical ? surfaceHover !== null : hover) ? 'pointer' : 'default' }}>
          {part ? (
            <Canvas frameloop="demand" dpr={[1, 2]} camera={{ position: [-160, 140, 200], fov: 30, near: 0.5, far: 5000 }} onPointerMissed={(e) => e.type === 'click' && onFocus(null)}>
              <color attach="background" args={[colors.ground]} />
              <hemisphereLight args={['#ffffff', '#8b9199', 1.2]} />
              <directionalLight position={[-300, 500, 400]} intensity={1.5} />
              <directionalLight position={[300, 150, -300]} intensity={0.5} />
              <group rotation={Z_UP}>
                {optical && optic && opticalShape ? (
                  <>
                    <OpticalView
                      key={part.id}
                      record={optic}
                      shape={opticalShape}
                      infos={infos}
                      surface={surface}
                      hover={surfaceHover}
                      onHover={setSurfaceHover}
                      onPick={setSurface}
                      accent={colors.accent}
                      meta={colors.meta}
                      groupRef={opticRef}
                    />
                    <Framing key={`optic ${part.id}`} target={() => opticRef.current} fitAll={fitAll} />
                  </>
                ) : preview ? (
                  <>
                    <HolderView
                      key={part.id}
                      {...preview}
                      {...view}
                      beamColor={clipped ? colors.warning : colors.accent}
                      onLoaded={(prepared) => setLoaded({ source: `holder ${part.id}`, mesh: prepared })}
                    />
                  </>
                ) : mesh && part.placement.state === 'in-cube' ? (
                  // A module that cannot be loaded shows its cube's outline; the rest of the editor carries on.
                  <MeshBoundary key={`${part.id} ${mesh.url}`} fallback={<CubeEdges color={colors.warning} opacity={0.6} />}>
                    <Suspense fallback={<CubeEdges color={colors.meta} opacity={0.5} />}>
                      <StoreModule mesh={mesh} turns={-part.placement.seat} {...view} onLoaded={(prepared) => setLoaded({ source: mesh.url, mesh: prepared })} />
                    </Suspense>
                  </MeshBoundary>
                ) : ideal ? (
                  <>
                    {/* Where its cube would go, and the candidate's glass in it (or the symbol, when there is none). */}
                    <CubeEdges color={colors.accent} opacity={0.4} dashed />
                    {candidate && candidateShape ? <CandidateLens key={candidate.record.id} record={candidate.record} shape={candidateShape} /> : <Glyph kind={part.kind} turns={0} color={colors.glyphs[part.kind]} outline={null} />}
                    <Framing fitAll={fitAll} />
                  </>
                ) : (
                  <>
                    <CubeEdges color={part.placement.state === 'in-cube' ? colors.meta : colors.warning} dashed={part.placement.state !== 'in-cube'} />
                    <Glyph kind={part.kind} turns={0} color={colors.glyphs[part.kind]} outline={null} />
                    <Framing fitAll={fitAll} />
                  </>
                )}
              </group>
            </Canvas>
          ) : (
            <Empty>Click a part on the canvas to look at it up close. In 3D, click the lens, its holder or the cube itself.</Empty>
          )}

          {part && !optical && !mesh && !preview && !ideal && (
            <Note>
              {designing
                ? draft?.road === PREVIEWED_ROAD
                  ? 'No prescription for this part, and the cartridge is cut from one: its symbol is shown.'
                  : 'Pick the lens cartridge to see a holder here: the lab draws only that road so far.'
                : part.placement.state === 'in-cube'
                  ? 'No 3D model of this module yet: its symbol is shown.'
                  : 'Not in a cube yet: mount it to see its module and what it is made of.'}
            </Note>
          )}

          {!optical && components.length > 0 && (
            <ComponentList key={designing ? 'designing' : 'looking'} initiallyOpen={!designing} components={components} focus={focus} hover={hover} onHover={setHover} onFocus={(key) => onFocus(key === focus ? null : key)} />
          )}

          {!optical && shown && <ComponentCard component={shown} picked={shown === focused} />}

          {!optical && section !== null && (
            <Paper variant="outlined" sx={{ position: 'absolute', right: (t) => t.spacing(1.5), top: (t) => t.spacing(1.5), display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 0.5, width: 260, zIndex: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                Cut at
              </Typography>
              <Slider size="small" min={-SECTION_MAX} max={SECTION_MAX} step={0.01} value={section} onChange={(_, v) => setSection(v as number)} aria-label="Section depth" />
              <Typography variant="caption" sx={{ minWidth: 44, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                {`${((section * CUBE_MM) / 2).toFixed(1)} mm`}
              </Typography>
            </Paper>
          )}
        </Box>

        {optical && optic && (
          <OpticsPanel
            record={optic}
            infos={infos}
            wavelengths={wavelengths}
            surface={surface}
            onSurface={setSurface}
            onHoverSurface={setSurfaceHover}
            onCoating={part?.prescription && onPrescription ? (i, id) => onPrescription(withCoating(part.prescription!, i, id)) : undefined}
          />
        )}

        {!optical && ideal && part && onSnap && (
          <SnapPanel
            label={part.label}
            spec={specLine(part)}
            candidates={candidates}
            request={candidatesRequest}
            shown={snapShown}
            onShow={setSnapShown}
            picked={chosen?.record.id ?? null}
            onPick={(id) => setSnapPicked({ part: part.id, id })}
            onSnap={onSnap}
            modules={modules}
            inputs={inputs}
            onRealize={(o) => onRealize?.(o)}
            onDesign={onDesign}
          />
        )}

        {!optical && designing && draft && facts && partName && (
          <HolderDesigner
            partName={partName}
            record={record}
            facts={facts}
            roads={roads}
            draft={draft}
            onDraft={setDraft}
            plan={plan}
            frozen={Boolean(saved)}
            changed={changed}
            onFreeze={() => onHolder?.({ generator: draft.road, params: draft.params as unknown as Record<string, unknown> })}
          />
        )}
      </Box>
    </Box>
  );
}

/* -------------------------------------------------------------------- */
/* In the canvas                                                         */
/* -------------------------------------------------------------------- */

/** How the components are looked at: the same for a store module and a holder designed here. */
interface ViewProps {
  colors: SceneColors;
  focus: string | null;
  hover: string | null;
  xray: boolean;
  isolate: boolean;
  section: number | null;
  fitAll: number;
  onHover: (key: string | null) => void;
  onFocus: (key: string | null) => void;
}

/** A catalogue lens, before it is chosen: its glass alone, at the cube centre. */
function CandidateLens({ record, shape }: { record: CatalogRecord; shape: OpticShape }) {
  const lens = useMemo(() => lensComponent(record, shape), [record, shape]);
  useEffect(() => () => disposeComponents([lens]), [lens]);
  return <ComponentMesh component={lens} outline={null} tinted={null} />;
}

/** A module from the store, turned into its seat. */
function StoreModule({ mesh, turns, onLoaded, ...view }: ViewProps & { mesh: MeshRef; turns: number; onLoaded: (mesh: PreparedMesh) => void }) {
  const prepared = useModuleMesh(mesh.url);
  useEffect(() => onLoaded(prepared), [prepared]); // eslint-disable-line react-hooks/exhaustive-deps -- report each mesh once
  const quaternion = useMemo(() => new Quaternion().setFromRotationMatrix(poseMatrix(mesh.axes, turns)), [mesh.axes, turns]);
  return <ModuleView prepared={prepared} quaternion={quaternion} {...view} />;
}

const BEAM_DIR: Record<BeamAxis, [number, number, number]> = { '+x': [1, 0, 0], '-x': [-1, 0, 0], '+y': [0, 1, 0], '-y': [0, -1, 0] };

interface HolderViewProps extends ViewProps {
  cubeMesh: string;
  params: CartridgeParams;
  shape: OpticShape;
  record: CatalogRecord;
  beamMm: number;
  beamColor: string;
  onLoaded: (mesh: PreparedMesh) => void;
}

/** A holder designed here: the empty store cube, the cartridge built from the draft, and the beam through them. */
/** The holder in the store's empty cube; without the cube (its outline only) when the cube cannot be loaded. */
function HolderView({ cubeMesh, ...props }: HolderViewProps) {
  const bare = (
    <>
      <CubeEdges color={props.colors.meta} opacity={0.5} />
      <HolderBody cube={NO_COMPONENTS} {...props} />
    </>
  );
  return (
    <MeshBoundary key={cubeMesh} fallback={bare}>
      <Suspense fallback={bare}>
        <HolderInCube cubeMesh={cubeMesh} {...props} />
      </Suspense>
    </MeshBoundary>
  );
}

const NO_COMPONENTS: MeshComponent[] = [];

function HolderInCube({ cubeMesh, ...props }: HolderViewProps) {
  return <HolderBody cube={useModuleMesh(cubeMesh).components} {...props} />;
}

function HolderBody({ cube, params, shape, record, beamMm, beamColor, onLoaded, ...view }: Omit<HolderViewProps, 'cubeMesh'> & { cube: MeshComponent[] }) {
  const key = JSON.stringify(params);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- rebuilt when the parameters change by value
  const built = useMemo(() => cartridgeComponents(params, shape, record), [key, shape, record]);
  useEffect(() => () => disposeComponents(built), [built]);
  const prepared = useMemo(() => ({ components: [...cube, ...built] }), [cube, built]);
  useEffect(() => onLoaded(prepared), [prepared]); // eslint-disable-line react-hooks/exhaustive-deps -- report each build once
  const dir = BEAM_DIR[params.beam_axis];
  const along = useMemo(() => new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), new Vector3(...dir)), [dir]);
  const reach = CUBE_MM / 2 + 15;
  return (
    <ModuleView prepared={prepared} {...view}>
      {/* The beam, from face to face and a little past: a faint tube of its Ø, and its axis. */}
      <mesh quaternion={along} raycast={() => null} renderOrder={2}>
        <cylinderGeometry args={[beamMm / 2, beamMm / 2, 2 * reach, 40, 1, true]} />
        <meshBasicMaterial color={beamColor} transparent opacity={0.2} depthWrite={false} side={DoubleSide} />
      </mesh>
      <Line points={[dir.map((v) => -v * reach) as [number, number, number], dir.map((v) => v * reach) as [number, number, number]]} color={beamColor} lineWidth={1.5} />
    </ModuleView>
  );
}

/** The components drawn, hovered and picked; X-ray, isolate and section. `children`: drawn beside them, never picked. */
function ModuleView({ prepared, quaternion, colors, focus, hover, xray, isolate, section, fitAll, onHover, onFocus, children }: ViewProps & { prepared: PreparedMesh; quaternion?: Quaternion; children?: ReactNode }) {
  const { components } = prepared;
  // The others, faint, in X-ray: this view's own material, so the main view's stay as they are.
  const faint = useMemo(() => new MeshStandardMaterial({ color: colors.placeholder, transparent: true, opacity: 0.12, depthWrite: false, roughness: 0.8 }), [colors.placeholder]);
  useEffect(() => () => faint.dispose(), [faint]);

  const focusKey = components.some((c) => c.info.key === focus) ? focus : null;
  const groups = useRef(new Map<string, Group>());
  const all = useRef<Group>(null);

  // The section: a plane across the document's y (front to back), keeping what is behind it.
  const plane = useMemo(() => new Plane(new Vector3(0, 0, -1), 0), []);
  const { gl, invalidate } = useThree();
  useEffect(() => {
    plane.constant = section === null ? 0 : (section * CUBE_MM) / 2;
    gl.clippingPlanes = section === null ? [] : [plane];
    invalidate();
    return () => {
      gl.clippingPlanes = [];
    };
  }, [section, gl, plane, invalidate]);

  /** The component under the pointer: the first hit that is drawn, not cut away, and (in X-ray) not faint. */
  const keyAt = (e: ThreeEvent<PointerEvent | MouseEvent>): string | null => {
    const hits = e.intersections.filter((i) => i.object.userData[COMPONENT_KEY] && (section === null || plane.distanceToPoint(i.point) >= 0));
    const solid = xray && focusKey ? hits.find((i) => i.object.userData[COMPONENT_KEY] === focusKey) : undefined;
    return ((solid ?? hits[0])?.object.userData[COMPONENT_KEY] as string | undefined) ?? null;
  };

  // Resolved after the groups are drawn: refs are not set yet while rendering.
  const target = () => (focusKey && groups.current.get(focusKey)) || all.current;
  return (
    <>
      <group
        ref={all}
        quaternion={quaternion}
        onPointerMove={(e) => {
          e.stopPropagation();
          const key = keyAt(e);
          if (key !== hover) onHover(key);
        }}
        onPointerOut={() => onHover(null)}
        onClick={(e) => {
          e.stopPropagation();
          if (e.delta > 4) return; // the end of an orbit
          const key = keyAt(e);
          onFocus(key === focusKey ? null : key);
        }}
      >
        {components.map((c) => {
          const key = c.info.key;
          const picked = key === focusKey;
          if (isolate && focusKey && !picked) return null;
          return (
            <group
              key={key}
              ref={(g) => {
                if (g) groups.current.set(key, g);
                else groups.current.delete(key);
              }}
            >
              <ComponentMesh
                component={xray && focusKey && !picked ? { ...c, pieces: c.pieces.map((p) => ({ ...p, material: faint })) } : c}
                outline={section === null && picked ? colors.accent : null}
                tinted={key === hover ? colors.accent : null}
              />
            </group>
          );
        })}
      </group>
      {children}
      <Framing target={target} fitAll={fitAll} focusKey={focusKey} isolated={isolate} />
    </>
  );
}

/** The camera: orbit with the left button, pan with the right or middle, zoom on the wheel; frames what is picked. */
function Framing({ target, fitAll, focusKey = null, isolated }: { target?: () => Group | null; fitAll: number; focusKey?: string | null; isolated?: boolean }) {
  const ref = useRef<CameraControlsImpl>(null);
  const { scene } = useThree();
  const first = useRef(true);
  useEffect(() => {
    const controls = ref.current;
    if (!controls) return;
    const { ACTION } = CameraControlsImpl;
    controls.mouseButtons.left = ACTION.ROTATE;
    controls.mouseButtons.right = ACTION.TRUCK;
    controls.mouseButtons.middle = ACTION.TRUCK;
    controls.dollyToCursor = true;
  }, []);
  useEffect(() => {
    const controls = ref.current;
    if (!controls) return;
    scene.updateMatrixWorld(true);
    const object = target?.();
    const box = object ? new Box3().setFromObject(object) : new Box3().setFromCenterAndSize(new Vector3(), new Vector3(CUBE_MM, CUBE_MM, CUBE_MM));
    if (box.isEmpty()) return;
    const sphere = box.getBoundingSphere(new Sphere());
    sphere.radius = Math.max(sphere.radius * 1.15, 6);
    if (first.current) controls.rotateTo(-Math.PI / 5, 1.05, false);
    controls.fitToSphere(sphere, !first.current);
    first.current = false;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `target` is new every render; what it resolves to changes with these
  }, [fitAll, focusKey, isolated, scene]);
  return <CameraControls ref={ref} makeDefault minDistance={5} maxDistance={2000} smoothTime={0.25} />;
}

/* -------------------------------------------------------------------- */
/* Over the canvas                                                       */
/* -------------------------------------------------------------------- */

function ToolButton({ label, icon, on, disabled, onClick }: { label: string; icon: ReactNode; on?: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <Tooltip title={label}>
      <span>
        <IconButton
          aria-label={label}
          aria-pressed={on}
          disabled={disabled}
          onClick={onClick}
          sx={{ borderRadius: 1, color: on ? 'primary.onSoft' : 'text.secondary', bgcolor: on ? 'primary.soft' : 'transparent' }}
        >
          {icon}
        </IconButton>
      </span>
    </Tooltip>
  );
}

const ROLE_ORDER: ComponentRole[] = ['enclosure', 'holder', 'optic', 'electronics', 'part', 'hardware'];

/** Groups that start folded: screws and washers are many and rarely what one looks for. */
const FOLDED_AT_FIRST: ComponentRole[] = ['hardware'];

/**
 * The module's components by role; hovering one lights it up, a click picks it (again: lets go).
 * The whole list folds down to its header, and each group folds on its own; a component picked
 * on a canvas opens its group, so the pick is always in view.
 */
function ComponentList({ components, focus, hover, onHover, onFocus, initiallyOpen = true }: { components: MeshComponent[]; focus: string | null; hover: string | null; onHover: (key: string | null) => void; onFocus: (key: string) => void; initiallyOpen?: boolean }) {
  const byRole = ROLE_ORDER.map((role) => ({ role, items: components.filter((c) => c.info.role === role) })).filter((g) => g.items.length);
  const [open, setOpen] = useState(initiallyOpen);
  const [folded, setFolded] = useState<Set<ComponentRole>>(() => new Set(FOLDED_AT_FIRST));
  const toggle = (role: ComponentRole) =>
    setFolded((f) => {
      const next = new Set(f);
      if (!next.delete(role)) next.add(role);
      return next;
    });

  // A pick from the canvas, in a folded group: open it.
  const focusRole = components.find((c) => c.info.key === focus)?.info.role;
  useEffect(() => {
    if (!focusRole) return;
    setFolded((f) => {
      if (!f.has(focusRole)) return f;
      const next = new Set(f);
      next.delete(focusRole);
      return next;
    });
  }, [focus, focusRole]);
  const picked = components.find((c) => c.info.key === focus);

  return (
    <Paper
      variant="outlined"
      onPointerLeave={() => onHover(null)}
      sx={(t) => ({
        position: 'absolute',
        top: t.spacing(1.5),
        left: t.spacing(1.5),
        width: 230,
        maxHeight: `calc(100% - ${t.spacing(3)})`,
        display: 'flex',
        flexDirection: 'column',
        zIndex: 2,
        bgcolor: 'color-mix(in srgb, var(--mui-palette-background-paper) 92%, transparent)',
        backdropFilter: 'blur(6px)',
      })}
    >
      <ListItemButton dense onClick={() => setOpen(!open)} aria-expanded={open} sx={{ flexShrink: 0, gap: 0.5, pr: 1, borderBottom: open ? 1 : 0, borderColor: 'divider' }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle2" noWrap>{`Components · ${components.length}`}</Typography>
          {!open && picked && (
            <Typography variant="caption" color="primary" noWrap component="div" sx={{ lineHeight: 1.3 }}>
              {picked.title}
            </Typography>
          )}
        </Box>
        {open ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
      </ListItemButton>
      <Box hidden={!open} sx={{ minHeight: 0, overflow: 'auto', scrollbarWidth: 'thin' }}>
        <List dense disablePadding aria-label="Components">
          {byRole.map(({ role, items }) => {
            const shut = folded.has(role);
            return (
              <li key={role}>
                <ul style={{ padding: 0 }}>
                  <ListItemButton dense onClick={() => toggle(role)} aria-expanded={!shut} sx={{ py: 0, pl: 1, gap: 0.25 }}>
                    {shut ? <ChevronRightIcon sx={{ fontSize: 16, color: 'text.secondary' }} /> : <ExpandMoreIcon sx={{ fontSize: 16, color: 'text.secondary' }} />}
                    <Typography variant="overline" color="text.secondary" sx={{ fontSize: 10, lineHeight: 2.4 }}>{`${ROLE_LABEL[role]} · ${items.length}`}</Typography>
                  </ListItemButton>
                  <Collapse in={!shut}>
                    {items.map((c) => (
                      <ListItemButton
                        key={c.info.key}
                        selected={c.info.key === focus}
                        onPointerEnter={() => onHover(c.info.key)}
                        onClick={() => onFocus(c.info.key)}
                        sx={{ py: 0.25, pl: 4, bgcolor: c.info.key === hover && c.info.key !== focus ? 'action.hover' : undefined }}
                      >
                        <Typography variant="body2" noWrap>
                          {c.title}
                        </Typography>
                      </ListItemButton>
                    ))}
                  </Collapse>
                </ul>
              </li>
            );
          })}
        </List>
      </Box>
    </Paper>
  );
}

const mm = (n: number) => (n >= 10 ? n.toFixed(1) : n.toFixed(2));

/** What the hovered or picked component is: where it comes from, its part number, its size and material. */
function ComponentCard({ component: c, picked }: { component: MeshComponent; picked: boolean }) {
  const size = c.box.getSize(new Vector3());
  const glass = c.pieces.some((p) => p.material.transparent);
  const swatches = [...new Set(c.pieces.map((p) => `#${p.material.color.getHexString()}`))].slice(0, 6);
  const rows: [string, ReactNode][] = [
    ['Kind', `${SOURCE_LABEL[c.info.source]} · ${ROLE_LABEL[c.info.role].toLowerCase()}`],
    ...(c.info.number ? [['Part no.', c.info.number] as [string, ReactNode]] : []),
    ['Code', c.info.code],
    ['Size', `${mm(size.x)} × ${mm(size.y)} × ${mm(size.z)} mm`],
    [
      'Look',
      <Stack key="look" direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
        {swatches.map((s) => (
          <Box key={s} sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: s, border: 1, borderColor: 'divider' }} />
        ))}
        <Typography variant="caption">{glass ? 'see-through' : 'opaque'}</Typography>
      </Stack>,
    ],
    ['Triangles', c.triangles.toLocaleString()],
  ];
  return (
    <Paper
      variant="outlined"
      sx={(t) => ({
        position: 'absolute',
        right: t.spacing(1.5),
        bottom: t.spacing(1.5),
        width: 280,
        p: 1.5,
        zIndex: 2,
        borderColor: picked ? 'primary.main' : 'divider',
        bgcolor: 'color-mix(in srgb, var(--mui-palette-background-paper) 94%, transparent)',
        backdropFilter: 'blur(6px)',
      })}
    >
      <Typography variant="subtitle2" sx={{ mb: 0.75 }}>
        {c.title}
      </Typography>
      <Box component="dl" sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: 1.5, rowGap: 0.25, m: 0 }}>
        {rows.map(([k, v]) => (
          <Box key={k} sx={{ display: 'contents' }}>
            <Typography component="dt" variant="caption" color="text.secondary">
              {k}
            </Typography>
            <Typography component="dd" variant="caption" sx={{ m: 0, minWidth: 0, overflowWrap: 'anywhere' }}>
              {v}
            </Typography>
          </Box>
        ))}
      </Box>
    </Paper>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return (
    <Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', p: 4 }}>
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 300, textAlign: 'center' }}>
        {children}
      </Typography>
    </Box>
  );
}

function Note({ children }: { children: ReactNode }) {
  return (
    <Paper variant="outlined" sx={(t) => ({ position: 'absolute', left: '50%', bottom: t.spacing(1.5), transform: 'translateX(-50%)', px: 2, py: 1, zIndex: 2, maxWidth: '80%' })}>
      <Typography variant="body2" color="text.secondary">
        {children}
      </Typography>
    </Paper>
  );
}
