import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/auth_controller.dart';
import '../../features/screens.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  final auth = ref.watch(authProvider);
  return GoRouter(
    initialLocation: '/splash',
    redirect: (context, state) {
      final isAuthPage = state.matchedLocation == '/login' ||
          state.matchedLocation == '/register';
      if (auth.status == AuthStatus.checking) return '/splash';
      if (auth.status == AuthStatus.signedOut && !isAuthPage) return '/login';
      if (auth.status == AuthStatus.signedIn &&
          (isAuthPage || state.matchedLocation == '/splash')) {
        return '/home';
      }
      return null;
    },
    routes: [
      GoRoute(path: '/splash', builder: (_, __) => const SplashScreen()),
      GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
      GoRoute(path: '/register', builder: (_, __) => const RegisterScreen()),
      ShellRoute(builder: (_, __, child) => AppShell(child: child), routes: [
        GoRoute(path: '/home', builder: (_, __) => const HomeScreen()),
        GoRoute(path: '/report', builder: (_, __) => const ReportScreen()),
        GoRoute(path: '/reports', builder: (_, __) => const MyReportsScreen()),
        GoRoute(
            path: '/notifications',
            builder: (_, __) => const NotificationsScreen()),
        GoRoute(path: '/profile', builder: (_, __) => const ProfileScreen()),
      ]),
    ],
  );
});
