import 'package:flutter_test/flutter_test.dart';
import 'package:cryptoaio/main.dart';

void main() {
  testWidgets('App smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const CryptoAioApp());
    expect(find.text('Watchlist'), findsOneWidget);
  });
}
