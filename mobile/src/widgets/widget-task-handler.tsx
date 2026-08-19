import type { WidgetTaskHandler } from 'react-native-android-widget';

import { readWidgetSnapshot } from '@/storage/widget';
import { BalanceWidget } from '@/widgets/BalanceWidget';

export const widgetTaskHandler: WidgetTaskHandler = async ({ widgetInfo, renderWidget }) => {
  if (widgetInfo.widgetName !== 'Balance') return;
  const snapshot = await readWidgetSnapshot();
  renderWidget(<BalanceWidget snapshot={snapshot} />);
};
