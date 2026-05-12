export interface ThemeTokens {
  gold: string;
  goldHover: string;
  goldDim: string;
  text1: string;
  text2: string;
  textMuted: string;
  textFaint: string;
  card: string;
  cardBorder: string;
  cardShadow: string;
  blur: string;
  sidebar: string;
  sidebarBorder: string;
  header: string;
  headerBorder: string;
  activeItemBg: string;
  activeItemBorder: string;
  hoverItemBg: string;
  iconBg: string;
  iconActive: string;
  iconInactive: string;
  green: string;
  greenBg: string;
  red: string;
  redBg: string;
  amber: string;
  amberBg: string;
  blue: string;
  blueBg: string;
  divider: string;
  chartLine: string;
  chartFill0: string;
  chartFill1: string;
  chartGrid: string;
  chartAxis: string;
}

export const LIGHT: ThemeTokens = {
  gold: '#d0a25a',
  goldHover: '#c08f45',
  goldDim: 'rgba(208,162,90,0.72)',

  text1: '#221a14',
  text2: 'rgba(34,26,20,0.96)',
  textMuted: '#493c31',
  textFaint: 'rgba(73,60,49,0.75)',

  card: 'rgba(255,255,255,0.34)',
  cardBorder: 'transparent',
  cardShadow: '0 12px 26px rgba(122,122,122,0.08), inset 0 1px 0 rgba(255,255,255,0.82), inset 0 -1px 0 rgba(214,214,214,0.38)',
  blur: 'blur(11px)',

  sidebar: 'rgba(255,255,255,0.34)',
  sidebarBorder: 'transparent',

  header: 'transparent',
  headerBorder: 'transparent',

  activeItemBg: 'rgba(255,255,255,0.56)',
  activeItemBorder: 'transparent',
  hoverItemBg: 'rgba(255,255,255,0.34)',

  iconBg: 'rgba(255,255,255,0.56)',
  iconActive: '#c89a4a',
  iconInactive: 'rgba(58,46,38,0.86)',

  green: '#23a46b',
  greenBg: 'rgba(35,164,107,0.10)',
  red: '#d88379',
  redBg: 'rgba(216,131,121,0.10)',
  amber: '#c89a4a',
  amberBg: 'rgba(200,154,74,0.10)',
  blue: '#7998ba',
  blueBg: 'rgba(121,152,186,0.10)',

  divider: 'rgba(120,93,69,0.12)',

  chartLine: '#c89a4a',
  chartFill0: 'rgba(200,154,74,0.28)',
  chartFill1: 'rgba(200,154,74,0.02)',
  chartGrid: 'rgba(143,115,85,0.05)',
  chartAxis: 'rgba(88,74,62,0.82)',
};

export const DARK: ThemeTokens = {
  gold: '#F5F7FA',
  goldHover: '#FFFFFF',
  goldDim: 'rgba(245,247,250,0.42)',

  text1: 'rgba(255,255,255,0.96)',
  text2: 'rgba(255,255,255,0.88)',
  textMuted: 'rgba(255,255,255,0.62)',
  textFaint: 'rgba(255,255,255,0.26)',

  card: 'rgba(21,23,28,0.74)',
  cardBorder: 'rgba(255,255,255,0.11)',
  cardShadow: '0 18px 40px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.05)',
  blur: 'none',

  sidebar: 'rgba(17,19,24,0.78)',
  sidebarBorder: 'rgba(255,255,255,0.11)',

  header: 'transparent',
  headerBorder: 'transparent',

  activeItemBg: 'rgba(255,255,255,0.12)',
  activeItemBorder: 'rgba(255,255,255,0.18)',
  hoverItemBg: 'rgba(255,255,255,0.06)',

  iconBg: 'rgba(255,255,255,0.06)',
  iconActive: 'rgba(255,255,255,0.96)',
  iconInactive: 'rgba(255,255,255,0.78)',

  green: '#10B981',
  greenBg: 'rgba(16,185,129,0.14)',
  red: '#EF4444',
  redBg: 'rgba(239,68,68,0.14)',
  amber: '#D7B17A',
  amberBg: 'rgba(215,177,122,0.14)',
  blue: '#60A5FA',
  blueBg: 'rgba(96,165,250,0.14)',

  divider: 'rgba(255,255,255,0.06)',

  chartLine: '#F1F5F9',
  chartFill0: 'rgba(241,245,249,0.28)',
  chartFill1: 'rgba(241,245,249,0.02)',
  chartGrid: 'rgba(255,255,255,0.06)',
  chartAxis: 'rgba(255,255,255,0.40)',
};

export function tok(isDark: boolean): ThemeTokens {
  return isDark ? DARK : LIGHT;
}
