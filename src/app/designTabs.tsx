/**
 * The File and Commercial tabs for the open design: the views wired to the
 * lab's demo data. In the product these are where the services come in
 * (accounts, versions, the shop); the views themselves stay as they are.
 */
import { demoChecks, demoCustomer, demoLabourRate, demoSupply } from '../demo/commercial';
import { demoDesignInfo, demoFiles, demoHistory } from '../demo/editorContent';
import { demoPeople, demoShareLink } from '../demo/fileContent';
import { demoPrices } from '../demo/prices';
import { bomCsv, bomFileName, buildBom } from '../components/editor/bom';
import { DESIGN_FILE_EXTENSION, designFileText, readDesignFile } from '../components/editor/designFile';
import { useLightFor } from '../components/editor/light';
import type { Schematic } from '../components/editor/model';
import { download } from '../components/primitives/download';
import { formatEur } from '../components/primitives/format';
import { CommercialView } from '../components/views/CommercialView';
import { FileView } from '../components/views/FileView';

interface DesignTabProps {
  id: string;
  name: string;
  version?: string;
  /** The design as it is now, with the edits made in View. */
  schematic: Schematic;
  /** Tell the person what happened. */
  onNotice: (text: string) => void;
}

export interface FileTabProps extends DesignTabProps {
  onRename: (name: string) => void;
  onNewProject: () => void;
  onOpenProjects: () => void;
  /** File a design as a new project (a copy, or one imported) and open it. */
  onAddProject: (name: string, schematic: Schematic) => void;
}

export function FileTab({ id, name, version, schematic, onNotice, onAddProject, ...actions }: FileTabProps) {
  return (
    <FileView
      name={name}
      version={version}
      info={demoDesignInfo}
      files={demoFiles}
      versions={demoHistory}
      people={demoPeople}
      link={demoShareLink(id)}
      {...actions}
      onRename={(newName) => {
        actions.onRename(newName);
        onNotice(`Renamed to ${newName}.`);
      }}
      onDuplicate={() => {
        onAddProject(`Copy of ${name}`, schematic);
        onNotice(`Saved a copy: Copy of ${name}.`);
      }}
      onDelete={() => onNotice('In the prototype, designs are not deleted.')}
      onExport={(format) => {
        if (format === 'archive') download(`${name}${DESIGN_FILE_EXTENSION}`, designFileText(schematic), 'application/json');
        if (format === 'bom') download(bomFileName(name), bomCsv(buildBom(schematic, demoPrices)), 'text/csv');
        if (format === 'link') {
          navigator.clipboard?.writeText(demoShareLink(id)).catch(() => {});
          onNotice('3D link copied.');
        }
      }}
      onImport={async (_, file) => {
        const imported = readDesignFile(await file.text());
        if (!imported) return onNotice(`${file.name} is not an Optikit design file.`);
        onAddProject(file.name.replace(/\.[^.]+$/, ''), imported);
        onNotice(`${file.name} opened as a new project.`);
      }}
      onNotice={onNotice}
    />
  );
}

export function CommercialTab({ name, version, schematic, onNotice }: DesignTabProps) {
  const lightFor = useLightFor();
  const bom = buildBom(schematic, demoPrices);
  return (
    <CommercialView
      designName={name}
      version={version}
      bom={bom}
      supply={demoSupply}
      labourRate={demoLabourRate}
      checks={demoChecks(schematic, bom, lightFor(schematic))}
      customer={demoCustomer}
      onSend={({ customer, total }) => onNotice(`Quote for ${formatEur(total)} sent to ${customer.email}, with a 3D link.`)}
      onCreateOdoo={() => onNotice('A draft quotation would be made in Odoo, with the design attached.')}
      onDownloadCsv={() => download(bomFileName(name), bomCsv(bom), 'text/csv')}
    />
  );
}
