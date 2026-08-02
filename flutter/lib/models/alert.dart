class Alert {
  final String id;
  final String symbol;
  final String condition; // 'above' | 'below'
  final double target;
  final bool fired;
  final String? note;

  Alert({
    required this.id,
    required this.symbol,
    required this.condition,
    required this.target,
    this.fired = false,
    this.note,
  });

  factory Alert.fromJson(Map<String, dynamic> j) => Alert(
        id: j['id']?.toString() ?? '',
        symbol: (j['symbol'] ?? '').toString().toUpperCase(),
        condition: j['condition'] ?? 'above',
        target: (j['target'] as num?)?.toDouble() ?? 0,
        fired: j['fired'] == true,
        note: j['note'],
      );
}
