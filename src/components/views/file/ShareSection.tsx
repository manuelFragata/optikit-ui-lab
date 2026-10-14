import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { PillSwitch } from '../../primitives/PillSwitch';
import { cardSx } from '../card';
import { Titled } from '../Titled';

export type ShareRole = 'owner' | 'edit' | 'view';

export interface SharePerson {
  name: string;
  email: string;
  role: ShareRole;
}

/** Who the link lets in, without an invitation. */
export type LinkAccess = 'invited' | 'view' | 'edit';

export interface ShareSectionProps {
  link: string;
  access: LinkAccess;
  people: SharePerson[];
  onAccess: (access: LinkAccess) => void;
  /** Change someone's role, or take them off (null). */
  onRole: (email: string, role: ShareRole | null) => void;
  onInvite: (email: string, role: ShareRole) => void;
  onCopyLink: () => void;
}

const ROLE_LABEL: Record<ShareRole, string> = { owner: 'Owner', edit: 'Can edit', view: 'Can view' };

/** Who can see and change the design: the link, and the people invited. */
export function ShareSection({ link, access, people, onAccess, onRole, onInvite, onCopyLink }: ShareSectionProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<ShareRole>('view');
  const valid = /^\S+@\S+\.\S+$/.test(email.trim());
  const invite = () => {
    if (!valid) return;
    onInvite(email.trim(), role);
    setEmail('');
  };

  return (
    <Stack sx={{ gap: 3 }}>
      <Titled title="The link">
        <Box sx={cardSx}>
          <Stack direction="row" sx={{ gap: 1.5, alignItems: 'center' }}>
            <TextField value={link} size="small" slotProps={{ input: { readOnly: true } }} sx={{ flex: 1 }} />
            <Button variant="outlined" startIcon={<ContentCopyIcon />} onClick={onCopyLink}>
              Copy
            </Button>
          </Stack>
          <Stack direction="row" useFlexGap sx={{ gap: 2, alignItems: 'center', flexWrap: 'wrap', mt: 2 }}>
            <Typography variant="body2" sx={{ flex: 1 }}>
              Anyone with the link
            </Typography>
            <PillSwitch
              aria-label="Anyone with the link"
              value={access}
              options={[
                { value: 'invited', label: 'Invited only' },
                { value: 'view', label: 'Can view' },
                { value: 'edit', label: 'Can edit' },
              ]}
              onChange={onAccess}
            />
          </Stack>
        </Box>
      </Titled>

      <Titled title="People">
        <Box sx={cardSx}>
          <Stack component="ul" sx={{ p: 0, m: 0, mt: -1, listStyle: 'none' }}>
            {people.map((p) => (
              <Stack component="li" key={p.email} direction="row" sx={{ alignItems: 'center', gap: 2, py: 1, '& + &': { borderTop: 1, borderColor: 'divider' } }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="subtitle2">{p.name}</Typography>
                  <Typography variant="meta" color="text.meta">
                    {p.email}
                  </Typography>
                </Box>
                {p.role === 'owner' ? (
                  <Typography variant="body2" color="text.secondary">
                    Owner
                  </Typography>
                ) : (
                  <Select<ShareRole | 'remove'>
                    size="small"
                    value={p.role}
                    onChange={(e) => onRole(p.email, e.target.value === 'remove' ? null : e.target.value)}
                    aria-label={`${p.name}'s access`}
                  >
                    <MenuItem value="edit">{ROLE_LABEL.edit}</MenuItem>
                    <MenuItem value="view">{ROLE_LABEL.view}</MenuItem>
                    <MenuItem value="remove">Remove</MenuItem>
                  </Select>
                )}
              </Stack>
            ))}
          </Stack>
          <Stack direction="row" sx={{ gap: 1.5, alignItems: 'center', mt: 2 }}>
            <TextField label="Invite by email" size="small" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && invite()} sx={{ flex: 1 }} />
            <Select size="small" value={role} onChange={(e) => setRole(e.target.value as ShareRole)} aria-label="Their access">
              <MenuItem value="edit">{ROLE_LABEL.edit}</MenuItem>
              <MenuItem value="view">{ROLE_LABEL.view}</MenuItem>
            </Select>
            <Button variant="outlined" disabled={!valid} onClick={invite}>
              Invite
            </Button>
          </Stack>
        </Box>
      </Titled>
    </Stack>
  );
}
