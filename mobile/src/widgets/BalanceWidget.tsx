import { FlexWidget, TextWidget } from 'react-native-android-widget';

import { appName } from '@/constants/app';
import type { BalanceWidgetSnapshot } from '@/storage/widget';

function formatTokens(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString('en-US');
}

export function BalanceWidget({ snapshot }: { snapshot: BalanceWidgetSnapshot }) {
  const english = snapshot.language === 'en';
  const updated = snapshot.updatedAt
    ? new Date(snapshot.updatedAt).toLocaleTimeString(english ? 'en-US' : 'zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '--:--';
  return (
    <FlexWidget
      accessibilityLabel={english ? `${appName} balance and token usage` : `${appName} 余额和 Token 消耗`}
      clickAction="OPEN_APP"
      style={{
        width: 'match_parent',
        height: 'match_parent',
        padding: 16,
        backgroundColor: '#0E5E4B',
        borderRadius: 16,
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}>
      <TextWidget
        text={appName}
        style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '700' }}
      />
      <FlexWidget style={{ flexDirection: 'row', justifyContent: 'space-between', width: 'match_parent' }}>
        <FlexWidget style={{ flexDirection: 'column' }}>
          <TextWidget
            text={english ? 'Balance' : '可用余额'}
            style={{ color: '#CFE7DE', fontSize: 11 }}
          />
          <TextWidget
            text={`${snapshot.currencySymbol}${snapshot.available.toFixed(2)}`}
            style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '700', marginTop: 3 }}
          />
        </FlexWidget>
        <FlexWidget style={{ flexDirection: 'column', alignItems: 'flex-end' }}>
          <TextWidget
            text={english ? 'Tokens' : '累计 Token'}
            style={{ color: '#CFE7DE', fontSize: 11 }}
          />
          <TextWidget
            text={formatTokens(snapshot.usedTokens)}
            style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '700', marginTop: 3 }}
          />
        </FlexWidget>
      </FlexWidget>
      <TextWidget
        text={`${english ? 'Updated' : '更新'} ${updated}`}
        style={{ color: '#A9D3C4', fontSize: 9 }}
      />
    </FlexWidget>
  );
}
