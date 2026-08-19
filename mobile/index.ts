import 'expo-router/entry';
import { Platform } from 'react-native';
import { registerWidgetTaskHandler } from 'react-native-android-widget';

import { widgetTaskHandler } from './src/widgets/widget-task-handler';

if (Platform.OS === 'android') {
  registerWidgetTaskHandler(widgetTaskHandler);
}