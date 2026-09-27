import { UI } from '../constants/palette';
import { NeonButton } from './NeonButton';
import { Panel } from './Panel';

type Props = { onResume: () => void; onRestart: () => void; onMenu: () => void };

export function PauseOverlay({ onResume, onRestart, onMenu }: Props) {
  return (
    <Panel title="PAUSED" titleColor={UI.accent}>
      <NeonButton label="RESUME" onPress={onResume} />
      <NeonButton label="RESTART" variant="secondary" onPress={onRestart} />
      <NeonButton label="MENU" variant="secondary" onPress={onMenu} />
    </Panel>
  );
}
