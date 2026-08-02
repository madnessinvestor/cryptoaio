import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'config/api_config.dart';
import 'screens/watchlist/watchlist_screen.dart';
import 'screens/dashboard/dashboard_screen.dart';
import 'screens/trade/trade_screen.dart';
import 'screens/alerts/alerts_screen.dart';
import 'screens/madai/madai_screen.dart';
import 'screens/widget_tab/widget_screen.dart';
import 'screens/config/config_screen.dart';

// ── App colours (matches the web dark theme) ─────────────────────────────────
class AppColors {
  static const background  = Color(0xFF0D0D0D);
  static const surface     = Color(0xFF1A1A1A);
  static const surfaceHigh = Color(0xFF252525);
  static const accent      = Color(0xFF39FF14); // neon green
  static const accentDim   = Color(0xFF1E8E0A);
  static const textPrimary = Color(0xFFFFFFFF);
  static const textSecond  = Color(0xFFAAAAAA);
  static const positive    = Color(0xFF00E676);
  static const negative    = Color(0xFFFF1744);
  static const divider     = Color(0xFF2A2A2A);
}

// ── AppState — thin layer that holds cross-screen state ──────────────────────
class AppState extends ChangeNotifier {
  String _currency = 'USD';
  String get currency => _currency;
  void setCurrency(String c) { _currency = c; notifyListeners(); }
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await ApiConfig.load();
  runApp(
    ChangeNotifierProvider(create: (_) => AppState(), child: const CryptoAioApp()),
  );
}

class CryptoAioApp extends StatelessWidget {
  const CryptoAioApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'CryptoAIO',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: AppColors.background,
        colorScheme: const ColorScheme.dark(
          primary: AppColors.accent,
          secondary: AppColors.accentDim,
          surface: AppColors.surface,
          onSurface: AppColors.textPrimary,
        ),
        cardTheme: const CardThemeData(
          color: AppColors.surface,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.all(Radius.circular(12)),
          ),
        ),
        bottomNavigationBarTheme: const BottomNavigationBarThemeData(
          backgroundColor: AppColors.surface,
          selectedItemColor: AppColors.accent,
          unselectedItemColor: AppColors.textSecond,
          type: BottomNavigationBarType.fixed,
          showSelectedLabels: true,
          showUnselectedLabels: true,
          selectedLabelStyle: TextStyle(fontSize: 10, fontWeight: FontWeight.w600),
          unselectedLabelStyle: TextStyle(fontSize: 10),
        ),
        dividerColor: AppColors.divider,
        useMaterial3: true,
      ),
      home: const MainScreen(),
    );
  }
}

class MainScreen extends StatefulWidget {
  const MainScreen({super.key});
  @override
  State<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends State<MainScreen> {
  int _tab = 1; // default: Watchlist

  static const _screens = [
    DashboardScreen(),
    WatchlistScreen(),
    TradeScreen(),
    AlertsScreen(),
    MadAiScreen(),
    WidgetScreen(),
    ConfigScreen(),
  ];

  static const _items = [
    BottomNavigationBarItem(icon: Icon(Icons.dashboard_outlined),     activeIcon: Icon(Icons.dashboard),     label: 'Dashboard'),
    BottomNavigationBarItem(icon: Icon(Icons.show_chart_outlined),    activeIcon: Icon(Icons.show_chart),    label: 'Watchlist'),
    BottomNavigationBarItem(icon: Icon(Icons.swap_vert_outlined),     activeIcon: Icon(Icons.swap_vert),     label: 'Trade'),
    BottomNavigationBarItem(icon: Icon(Icons.notifications_outlined), activeIcon: Icon(Icons.notifications), label: 'Alertas'),
    BottomNavigationBarItem(icon: Icon(Icons.smart_toy_outlined),     activeIcon: Icon(Icons.smart_toy),     label: 'Mad AI'),
    BottomNavigationBarItem(icon: Icon(Icons.widgets_outlined),       activeIcon: Icon(Icons.widgets),       label: 'Widget'),
    BottomNavigationBarItem(icon: Icon(Icons.settings_outlined),      activeIcon: Icon(Icons.settings),      label: 'Config'),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(index: _tab, children: _screens),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _tab,
        onTap: (i) => setState(() => _tab = i),
        items: _items,
      ),
    );
  }
}
