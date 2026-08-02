import 'package:flutter/material.dart';
import '../../models/alert.dart';
import '../../services/api_service.dart';
import '../../main.dart';

class AlertsScreen extends StatefulWidget {
  const AlertsScreen({super.key});
  @override
  State<AlertsScreen> createState() => _AlertsScreenState();
}

class _AlertsScreenState extends State<AlertsScreen> with AutomaticKeepAliveClientMixin {
  @override
  bool get wantKeepAlive => true;

  List<Alert> _alerts = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final raw = await ApiService.getAlerts();
      if (mounted) setState(() {
        _alerts = raw.map((j) => Alert.fromJson(j as Map<String, dynamic>)).toList();
        _loading = false;
      });
    } catch (e) {
      if (mounted) setState(() { _error = e.toString(); _loading = false; });
    }
  }

  Future<void> _addAlert() async {
    final symCtrl = TextEditingController();
    final tgtCtrl = TextEditingController();
    String condition = 'above';

    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSt) => Padding(
          padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom, left: 16, right: 16, top: 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Novo Alerta', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              TextField(
                controller: symCtrl,
                style: const TextStyle(color: Colors.white),
                textCapitalization: TextCapitalization.characters,
                decoration: _inputDeco('Símbolo (ex: BTC)'),
              ),
              const SizedBox(height: 12),
              Row(children: [
                Expanded(child: TextField(
                  controller: tgtCtrl,
                  style: const TextStyle(color: Colors.white),
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  decoration: _inputDeco('Preço alvo (USD)'),
                )),
                const SizedBox(width: 12),
                DropdownButton<String>(
                  value: condition,
                  dropdownColor: AppColors.surfaceHigh,
                  style: const TextStyle(color: Colors.white),
                  items: const [
                    DropdownMenuItem(value: 'above', child: Text('⬆ Acima')),
                    DropdownMenuItem(value: 'below', child: Text('⬇ Abaixo')),
                  ],
                  onChanged: (v) => setSt(() => condition = v!),
                ),
              ]),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () async {
                    final sym = symCtrl.text.trim().toUpperCase();
                    final tgt = double.tryParse(tgtCtrl.text.replaceAll(',', '.'));
                    if (sym.isEmpty || tgt == null) return;
                    Navigator.pop(ctx);
                    try {
                      await ApiService.addAlert({'symbol': sym, 'condition': condition, 'target': tgt});
                      await _load();
                    } catch (e) {
                      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erro: $e'), backgroundColor: Colors.red));
                    }
                  },
                  style: ElevatedButton.styleFrom(backgroundColor: AppColors.accent, foregroundColor: Colors.black),
                  child: const Text('+ Criar alerta', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _delete(Alert a) async {
    try {
      await ApiService.deleteAlert(a.id);
      await _load();
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erro: $e'), backgroundColor: Colors.red));
    }
  }

  Future<void> _reset(Alert a) async {
    try {
      await ApiService.resetAlert(a.id);
      await _load();
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erro: $e'), backgroundColor: Colors.red));
    }
  }

  static InputDecoration _inputDeco(String hint) => InputDecoration(
    hintText: hint, hintStyle: const TextStyle(color: AppColors.textSecond),
    filled: true, fillColor: AppColors.surfaceHigh,
    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide.none),
  );

  @override
  Widget build(BuildContext context) {
    super.build(context);
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Alertas', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        backgroundColor: AppColors.background,
        elevation: 0,
        actions: [IconButton(icon: const Icon(Icons.refresh, color: AppColors.textSecond), onPressed: _load)],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _addAlert,
        backgroundColor: AppColors.accent,
        foregroundColor: Colors.black,
        child: const Icon(Icons.add),
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_loading) return const Center(child: CircularProgressIndicator(color: AppColors.accent));
    if (_error != null) return Center(child: Text(_error!, style: const TextStyle(color: Colors.red)));
    if (_alerts.isEmpty) return const Center(
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        Icon(Icons.notifications_off_outlined, color: AppColors.textSecond, size: 48),
        SizedBox(height: 12),
        Text('Nenhum alerta configurado', style: TextStyle(color: Colors.white)),
        SizedBox(height: 4),
        Text('Toque em + para criar', style: TextStyle(color: AppColors.textSecond, fontSize: 12)),
      ]),
    );
    return RefreshIndicator(
      color: AppColors.accent,
      onRefresh: _load,
      child: ListView.separated(
        padding: const EdgeInsets.only(top: 8, bottom: 80),
        itemCount: _alerts.length,
        separatorBuilder: (_, __) => const Divider(color: AppColors.divider, height: 1, indent: 16, endIndent: 16),
        itemBuilder: (_, i) {
          final a = _alerts[i];
          final isAbove = a.condition == 'above';
          return ListTile(
            leading: CircleAvatar(
              backgroundColor: a.fired ? AppColors.positive.withOpacity(0.2) : AppColors.surfaceHigh,
              child: Text(a.symbol.isNotEmpty ? a.symbol[0] : '?',
                  style: TextStyle(color: a.fired ? AppColors.positive : Colors.white, fontWeight: FontWeight.bold)),
            ),
            title: Text('${a.symbol} ${isAbove ? '⬆' : '⬇'} \$${_fmtTarget(a.target)}',
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
            subtitle: Text(
              a.fired ? '🔔 Disparado' : (isAbove ? 'Alerta quando subir acima do alvo' : 'Alerta quando cair abaixo do alvo'),
              style: TextStyle(color: a.fired ? AppColors.positive : AppColors.textSecond, fontSize: 12),
            ),
            trailing: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (a.fired)
                  IconButton(
                    icon: const Icon(Icons.refresh, color: AppColors.textSecond, size: 20),
                    tooltip: 'Reativar',
                    onPressed: () => _reset(a),
                  ),
                IconButton(
                  icon: const Icon(Icons.delete_outline, color: Colors.red, size: 20),
                  tooltip: 'Deletar',
                  onPressed: () => _delete(a),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  static String _fmtTarget(double v) {
    if (v >= 1) return v.toStringAsFixed(2);
    if (v >= 0.001) return v.toStringAsFixed(4);
    return v.toStringAsFixed(8);
  }
}
