/**
 * UI Components - エクスポート
 */

export {
  Button,
  createButton,
  createScrollButton,
  createAccentButton,
  createIconButton,
} from './Button';
export type { ButtonVariant, ButtonSize, ButtonOptions } from './Button';

export {
  Panel,
  createPanel,
  createParchmentPanel,
  createDarkPanel,
} from './Panel';
export type { PanelVariant, PanelOptions } from './Panel';

export {
  Modal,
  createModal,
  createConfirmDialog,
  createAlertDialog,
} from './Modal';
export type { ModalOptions } from './Modal';

export {
  createDecorativeFrame,
  createOrnateDivider,
  createSimpleDivider,
  createTitleBanner,
  createScrollContainer,
  getScrollContainerContent,
  createIconBadge,
  createStatusIndicator,
} from './Decorations';

export { BattlePauseMenu } from './BattlePauseMenu';
export { BattleTooltip } from './BattleTooltip';
export type { EnemyInfoForTooltip } from './BattleTooltip';
export { ActionCountPanel } from './ActionCountPanel';
export { BattleTextOverlay } from './BattleTextOverlay';
