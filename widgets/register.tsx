// Nur in echten Android-Builds geladen (siehe index.ts / lib/widget-bridge.ts).
import { registerWidgetConfigurationScreen, registerWidgetTaskHandler } from 'react-native-android-widget';
import { DreamWidgetConfig } from './DreamWidgetConfig';
import { dreamWidgetTaskHandler } from './dream-widget-data';

registerWidgetTaskHandler(dreamWidgetTaskHandler);
registerWidgetConfigurationScreen(DreamWidgetConfig);
