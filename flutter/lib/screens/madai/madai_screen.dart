import 'package:flutter/material.dart';
import '../../services/api_service.dart';
import '../../main.dart';

class _Message {
  final String role; // 'user' | 'assistant'
  final String content;
  _Message(this.role, this.content);
}

class MadAiScreen extends StatefulWidget {
  const MadAiScreen({super.key});
  @override
  State<MadAiScreen> createState() => _MadAiScreenState();
}

class _MadAiScreenState extends State<MadAiScreen> with AutomaticKeepAliveClientMixin {
  @override
  bool get wantKeepAlive => true;

  final List<_Message> _messages = [];
  final _ctrl = TextEditingController();
  final _scrollCtrl = ScrollController();
  bool _sending = false;
  bool? _aiAvailable;

  @override
  void initState() {
    super.initState();
    _checkAi();
  }

  @override
  void dispose() {
    _ctrl.dispose();
    _scrollCtrl.dispose();
    super.dispose();
  }

  Future<void> _checkAi() async {
    try {
      final s = await ApiService.aiStatus();
      if (mounted) setState(() => _aiAvailable = s['available'] == true || (s['providers'] as List?)?.isNotEmpty == true);
    } catch (_) {
      if (mounted) setState(() => _aiAvailable = false);
    }
  }

  Future<void> _send() async {
    final text = _ctrl.text.trim();
    if (text.isEmpty || _sending) return;
    _ctrl.clear();
    setState(() {
      _messages.add(_Message('user', text));
      _sending = true;
    });
    _scrollToBottom();

    try {
      final history = _messages
          .take(_messages.length - 1)
          .map((m) => {'role': m.role, 'content': m.content})
          .toList()
          .cast<Map<String, dynamic>>();
      history.add({'role': 'user', 'content': text});

      final res = await ApiService.aiChat(history);
      final reply = res['content'] as String? ?? res['message'] as String? ?? '...';
      if (mounted) setState(() {
        _messages.add(_Message('assistant', reply));
        _sending = false;
      });
    } catch (e) {
      if (mounted) setState(() {
        _messages.add(_Message('assistant', '⚠️ Erro: $e'));
        _sending = false;
      });
    }
    _scrollToBottom();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollCtrl.hasClients) {
        _scrollCtrl.animateTo(_scrollCtrl.position.maxScrollExtent,
            duration: const Duration(milliseconds: 300), curve: Curves.easeOut);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Row(children: [
          Container(
            width: 28, height: 28,
            decoration: BoxDecoration(color: AppColors.accent, borderRadius: BorderRadius.circular(6)),
            child: const Icon(Icons.smart_toy, color: Colors.black, size: 16),
          ),
          const SizedBox(width: 8),
          const Text('Mad AI', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        ]),
        backgroundColor: AppColors.background,
        elevation: 0,
        actions: [
          if (_messages.isNotEmpty)
            IconButton(
              icon: const Icon(Icons.delete_outline, color: AppColors.textSecond),
              onPressed: () => setState(() => _messages.clear()),
            ),
        ],
      ),
      body: Column(children: [
        if (_aiAvailable == false)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(12),
            color: Colors.orange.withOpacity(0.15),
            child: const Text(
              '⚠️ Nenhuma chave de IA configurada. Configure GROQ_API_KEY, GOOGLE_AI_API_KEY ou OPENROUTER_API_KEY no servidor.',
              style: TextStyle(color: Colors.orange, fontSize: 12),
              textAlign: TextAlign.center,
            ),
          ),
        Expanded(
          child: _messages.isEmpty
              ? _emptyView()
              : ListView.builder(
                  controller: _scrollCtrl,
                  padding: const EdgeInsets.all(16),
                  itemCount: _messages.length + (_sending ? 1 : 0),
                  itemBuilder: (_, i) {
                    if (i == _messages.length) return _TypingIndicator();
                    return _ChatBubble(msg: _messages[i]);
                  },
                ),
        ),
        _InputBar(ctrl: _ctrl, sending: _sending, onSend: _send),
      ]),
    );
  }

  Widget _emptyView() => Center(
    child: Column(mainAxisSize: MainAxisSize.min, children: [
      Container(
        width: 64, height: 64,
        decoration: BoxDecoration(color: AppColors.accent.withOpacity(0.1), borderRadius: BorderRadius.circular(16)),
        child: const Icon(Icons.smart_toy_outlined, color: AppColors.accent, size: 32),
      ),
      const SizedBox(height: 16),
      const Text('Mad AI', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
      const SizedBox(height: 8),
      const Text('Analise ativos, portfólio e trades\ncom IA integrada.', style: TextStyle(color: AppColors.textSecond, fontSize: 13), textAlign: TextAlign.center),
    ]),
  );
}

class _ChatBubble extends StatelessWidget {
  final _Message msg;
  const _ChatBubble({required this.msg});

  @override
  Widget build(BuildContext context) {
    final isUser = msg.role == 'user';
    return Align(
      alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.78),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: isUser ? AppColors.accentDim : AppColors.surface,
          borderRadius: BorderRadius.circular(16).copyWith(
            bottomRight: isUser ? const Radius.circular(4) : null,
            bottomLeft: !isUser ? const Radius.circular(4) : null,
          ),
        ),
        child: Text(msg.content, style: const TextStyle(color: Colors.white, fontSize: 14, height: 1.4)),
      ),
    );
  }
}

class _TypingIndicator extends StatelessWidget {
  @override
  Widget build(BuildContext context) => const Align(
    alignment: Alignment.centerLeft,
    child: Padding(
      padding: EdgeInsets.only(bottom: 12),
      child: SizedBox(width: 50, child: LinearProgressIndicator(color: AppColors.accent, backgroundColor: AppColors.surface)),
    ),
  );
}

class _InputBar extends StatelessWidget {
  final TextEditingController ctrl;
  final bool sending;
  final VoidCallback onSend;
  const _InputBar({required this.ctrl, required this.sending, required this.onSend});

  @override
  Widget build(BuildContext context) => Container(
    padding: EdgeInsets.fromLTRB(16, 8, 16, MediaQuery.of(context).viewInsets.bottom + 12),
    color: AppColors.surface,
    child: Row(children: [
      Expanded(
        child: TextField(
          controller: ctrl,
          style: const TextStyle(color: Colors.white),
          maxLines: 3, minLines: 1,
          textInputAction: TextInputAction.send,
          onSubmitted: (_) => onSend(),
          decoration: InputDecoration(
            hintText: 'Pergunte sobre cripto, portfólio…',
            hintStyle: const TextStyle(color: AppColors.textSecond),
            filled: true, fillColor: AppColors.surfaceHigh,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(24), borderSide: BorderSide.none),
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          ),
        ),
      ),
      const SizedBox(width: 8),
      GestureDetector(
        onTap: sending ? null : onSend,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          width: 44, height: 44,
          decoration: BoxDecoration(
            color: sending ? AppColors.surfaceHigh : AppColors.accent,
            shape: BoxShape.circle,
          ),
          child: sending
              ? const Padding(padding: EdgeInsets.all(12), child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.accent))
              : const Icon(Icons.send_rounded, color: Colors.black, size: 20),
        ),
      ),
    ]),
  );
}
