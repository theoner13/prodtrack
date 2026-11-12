import { Link } from 'expo-router';
import type { ReactNode } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import type { EdgeInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/AuthProvider';
import { ClocheNotifications } from '@/components/cloche-notifications';
import { Logo } from '@/components/logo';
import {
  couleurs,
  espacements,
  largeurBarreLaterale,
  ombres,
  polices,
  seuilOrdinateur,
  tailleToucheMin,
  tailles,
} from '@/theme';

type RouteOnglet = { key: string; name: string; params?: object };

type OptionsRoute = {
  title?: string;
  tabBarLabel?: string | ((props: unknown) => ReactNode);
  tabBarIcon?: (props: {
    focused: boolean;
    color: string;
    size: number;
  }) => ReactNode;
  tabBarBadge?: string | number;
  tabBarBadgeStyle?: object;
  href?: string | null;
  hidden?: boolean;
  tabBarAccessibilityLabel?: string;
};

/** Props reçues de `<Tabs tabBar={...}>` (expo-router). */
export type PropsBarreOnglets = {
  state: { index: number; routes: RouteOnglet[] };
  descriptors: Record<string, { options: OptionsRoute }>;
  emitter: {
    emit: (event: {
      type: 'tabPress' | 'tabLongPress';
      target: string;
      canPreventDefault?: boolean;
    }) => { defaultPrevented: boolean };
  };
  navigateToTab: (routeKey: string) => void;
  insets: EdgeInsets;
};

function libelleOnglet(options: OptionsRoute, name: string): string {
  if (typeof options.tabBarLabel === 'string') return options.tabBarLabel;
  if (typeof options.title === 'string') return options.title;
  return name;
}

function estMasque(options: OptionsRoute): boolean {
  return options.href === null || options.hidden === true;
}

/** Barre d'onglets : pilule flottante (téléphone) ou latérale (ordinateur ≥ 900 px). */
export function BarreOnglets({
  state,
  descriptors,
  emitter,
  navigateToTab,
  insets,
}: PropsBarreOnglets) {
  const { width } = useWindowDimensions();
  const ordinateur = width >= seuilOrdinateur;

  const routesVisibles = state.routes.filter((route) => {
    const { options } = descriptors[route.key];
    return !estMasque(options);
  });

  if (ordinateur) {
    return (
      <BarreLaterale
        state={state}
        descriptors={descriptors}
        emitter={emitter}
        navigateToTab={navigateToTab}
        insets={insets}
        routesVisibles={routesVisibles}
      />
    );
  }

  const beaucoupOnglets = routesVisibles.length >= 6;

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.flottanteWrap,
        { paddingBottom: Math.max(insets.bottom, 12), paddingHorizontal: 12 },
      ]}
    >
      <View
        style={[
          styles.pilule,
          ombres.barre,
          Platform.OS === 'web'
            ? ({
                backdropFilter: 'blur(18px)',
                WebkitBackdropFilter: 'blur(18px)',
              } as object)
            : null,
        ]}
      >
        {routesVisibles.map((route) => {
          const { options } = descriptors[route.key];
          const indexRoute = state.routes.findIndex((r) => r.key === route.key);
          const focused = state.index === indexRoute;
          const label = libelleOnglet(options, route.name);
          const onPress = () => {
            const event = emitter.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigateToTab(route.key);
            }
          };
          const onLongPress = () => {
            emitter.emit({ type: 'tabLongPress', target: route.key });
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
              onPress={onPress}
              onLongPress={onLongPress}
              style={({ pressed }) => [
                styles.ongletMobile,
                focused && beaucoupOnglets ? styles.ongletMobileActifFlex : null,
                pressed && styles.appuye,
              ]}
            >
              <View
                style={[
                  styles.iconePastille,
                  focused && styles.iconePastilleActive,
                  focused && beaucoupOnglets && styles.iconePastilleActiveLarge,
                ]}
              >
                {options.tabBarIcon
                  ? options.tabBarIcon({
                      focused,
                      color: focused ? couleurs.texteSurPrincipal : couleurs.ongletInactif,
                      size: 20,
                    })
                  : null}
                {focused && beaucoupOnglets ? (
                  <Text style={styles.labelDansPastille} numberOfLines={1}>
                    {label}
                  </Text>
                ) : null}
                {options.tabBarBadge != null ? (
                  <View style={[styles.badge, options.tabBarBadgeStyle]}>
                    <Text style={styles.badgeTexte}>{String(options.tabBarBadge)}</Text>
                  </View>
                ) : null}
              </View>
              {beaucoupOnglets ? (
                focused ? null : (
                  <Text style={styles.labelCache} numberOfLines={1}>
                    {label}
                  </Text>
                )
              ) : (
                <Text
                  style={[styles.labelMobile, focused ? styles.labelMobileActif : null]}
                  numberOfLines={1}
                >
                  {label}
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function BarreLaterale({
  state,
  descriptors,
  emitter,
  navigateToTab,
  routesVisibles,
}: PropsBarreOnglets & { routesVisibles: RouteOnglet[] }) {
  const { profil } = useAuth();
  const initiale = (profil?.prenom?.trim().charAt(0) ?? 'P').toUpperCase();

  return (
    <View style={styles.laterale}>
      <View style={styles.lateraleHaut}>
        <Logo variante="complet" taille={120} />
      </View>
      <View style={styles.lateraleListe}>
        {routesVisibles.map((route) => {
          const { options } = descriptors[route.key];
          const indexRoute = state.routes.findIndex((r) => r.key === route.key);
          const focused = state.index === indexRoute;
          const label = libelleOnglet(options, route.name);
          const onPress = () => {
            const event = emitter.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigateToTab(route.key);
            }
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
              onPress={onPress}
              style={({ pressed }) => [
                styles.ongletLateral,
                focused && styles.ongletLateralActif,
                pressed && styles.appuye,
              ]}
            >
              <View style={styles.iconeLateralWrap}>
                {options.tabBarIcon
                  ? options.tabBarIcon({
                      focused,
                      color: focused ? couleurs.texteSurPrincipal : couleurs.ongletInactif,
                      size: 20,
                    })
                  : null}
                {options.tabBarBadge != null ? (
                  <View style={[styles.badge, styles.badgeLateral, options.tabBarBadgeStyle]}>
                    <Text style={styles.badgeTexte}>{String(options.tabBarBadge)}</Text>
                  </View>
                ) : null}
              </View>
              <Text
                style={[styles.labelLateral, focused && styles.labelLateralActif]}
                numberOfLines={1}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.lateraleBas}>
        <ClocheNotifications />
        <Link href="/profil" accessibilityLabel="Profil">
          <View style={styles.avatarZone} accessibilityRole="button">
            <View style={styles.avatar}>
              <Text style={styles.initiale}>{initiale}</Text>
            </View>
          </View>
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flottanteWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 50,
  },
  pilule: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    minHeight: 64,
    borderRadius: 28,
    paddingHorizontal: 6,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.86)',
  },
  ongletMobile: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    minHeight: 48,
  },
  ongletMobileActifFlex: {
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: 'auto',
  },
  iconePastille: {
    width: 44,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  iconePastilleActive: {
    backgroundColor: couleurs.principal,
  },
  iconePastilleActiveLarge: {
    width: 'auto',
    minWidth: 44,
    paddingHorizontal: 8,
    height: 36,
    borderRadius: 18,
  },
  labelDansPastille: {
    fontSize: 13,
    fontWeight: '600',
    color: couleurs.texteSurPrincipal,
    fontFamily: polices.sans,
  },
  labelMobile: {
    fontSize: 10,
    fontWeight: '500',
    color: couleurs.ongletInactifTexte,
    fontFamily: polices.sans,
  },
  labelMobileActif: {
    color: couleurs.texte,
    fontWeight: '600',
  },
  labelCache: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
    overflow: 'hidden',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    backgroundColor: couleurs.croutePoint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeLateral: {
    top: -4,
    right: -6,
  },
  badgeTexte: {
    color: couleurs.texteSurPrincipal,
    fontSize: 10,
    fontWeight: '600',
    fontFamily: polices.sans,
  },
  laterale: {
    flexGrow: 0,
    flexShrink: 0,
    width: largeurBarreLaterale,
    alignSelf: 'stretch',
    backgroundColor: couleurs.surface,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: couleurs.bordureDouce,
    paddingTop: espacements.l,
    paddingBottom: espacements.l,
    paddingHorizontal: espacements.s,
    justifyContent: 'space-between',
  },
  lateraleHaut: {
    paddingHorizontal: espacements.s,
    paddingBottom: espacements.m,
    alignItems: 'flex-start',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: couleurs.bordureDouce,
    marginBottom: espacements.s,
  },
  lateraleListe: {
    flex: 1,
    gap: 4,
  },
  ongletLateral: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
  },
  ongletLateralActif: {
    backgroundColor: couleurs.principal,
  },
  iconeLateralWrap: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelLateral: {
    flex: 1,
    fontSize: tailles.petit,
    fontWeight: '500',
    color: couleurs.texteSecondaire,
    fontFamily: polices.sans,
  },
  labelLateralActif: {
    color: couleurs.texteSurPrincipal,
    fontWeight: '600',
  },
  lateraleBas: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 8,
    paddingHorizontal: espacements.s,
    paddingTop: espacements.m,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: couleurs.bordureDouce,
    marginTop: espacements.s,
  },
  avatarZone: {
    width: tailleToucheMin,
    height: tailleToucheMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: couleurs.principal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initiale: {
    color: couleurs.texteSurPrincipal,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: polices.sans,
  },
  appuye: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
});
