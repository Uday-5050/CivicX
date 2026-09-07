import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

import '../core/localization/app_language.dart';
import '../core/models/models.dart';
import '../core/storage/draft_store.dart';
import 'auth/auth_controller.dart';

final draftStoreProvider = Provider<DraftStore>((_) => DraftStore());
final problemsProvider = FutureProvider.autoDispose<List<Problem>>(
    (ref) => ref.read(apiClientProvider).myProblems());

class SplashScreen extends StatelessWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context) =>
      const Scaffold(body: Center(child: CircularProgressIndicator()));
}

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});
  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final email = TextEditingController();
  final password = TextEditingController();
  bool busy = false;

  @override
  void dispose() {
    email.dispose();
    password.dispose();
    super.dispose();
  }

  Future<void> submit() async {
    if (email.text.trim().isEmpty || password.text.isEmpty) return;
    setState(() => busy = true);
    final ok = await ref
        .read(authProvider.notifier)
        .login(email.text.trim(), password.text);
    if (mounted) {
      setState(() => busy = false);
      if (!ok) _show(ref.read(authProvider).error ?? 'Unable to sign in');
    }
  }

  void demoLogin() => ref.read(authProvider.notifier).demoLogin();

  void _show(String text) =>
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(text)));

  @override
  Widget build(BuildContext context) {
    final language = ref.watch(appLanguageProvider);
    String text(String english, String hindi) =>
        localized(language, english, hindi);
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 440),
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Align(
                      alignment: Alignment.centerRight,
                      child: SegmentedButton<AppLanguage>(
                        segments: const [
                          ButtonSegment(
                              value: AppLanguage.english,
                              label: Text('English')),
                          ButtonSegment(
                              value: AppLanguage.hindi, label: Text('हिंदी')),
                        ],
                        selected: {language},
                        onSelectionChanged: (value) => ref
                            .read(appLanguageProvider.notifier)
                            .state = value.first,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Center(
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(28),
                        child: Image.asset('assets/branding/civix_logo.jpeg',
                            height: 168),
                      ),
                    ),
                    const SizedBox(height: 20),
                    Text(text('Welcome to Civix', 'Civix में आपका स्वागत है'),
                        style: Theme.of(context).textTheme.headlineMedium,
                        textAlign: TextAlign.center),
                    const SizedBox(height: 8),
                    Text(
                        text(
                            'Connect your community challenge to a practical solution.',
                            'अपने समुदाय की समस्या को व्यावहारिक समाधान से जोड़ें।'),
                        textAlign: TextAlign.center),
                    const SizedBox(height: 28),
                    TextField(
                        controller: email,
                        keyboardType: TextInputType.emailAddress,
                        decoration:
                            InputDecoration(labelText: text('Email', 'ईमेल'))),
                    const SizedBox(height: 12),
                    TextField(
                        controller: password,
                        obscureText: true,
                        decoration: InputDecoration(
                            labelText: text('Password', 'पासवर्ड'))),
                    const SizedBox(height: 20),
                    FilledButton(
                        onPressed: busy ? null : submit,
                        child: busy
                            ? const CircularProgressIndicator()
                            : Text(text('Sign in', 'साइन इन करें'))),
                    const SizedBox(height: 12),
                    OutlinedButton.icon(
                        onPressed: busy ? null : demoLogin,
                        icon: const Icon(Icons.play_circle_outline),
                        label: Text(text('Continue in demo mode',
                            'डेमो मोड में जारी रखें'))),
                    const SizedBox(height: 8),
                    Text(
                        text('Demo mode does not contact the Civix server.',
                            'डेमो मोड Civix सर्वर से नहीं जुड़ता है।'),
                        textAlign: TextAlign.center),
                    TextButton(
                        onPressed: () => context.push('/register'),
                        child: Text(text(
                            'Create a citizen account', 'नागरिक खाता बनाएँ'))),
                  ]),
            ),
          ),
        ),
      ),
    );
  }
}

class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});
  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  final name = TextEditingController();
  final email = TextEditingController();
  final password = TextEditingController();
  bool busy = false;

  @override
  void dispose() {
    name.dispose();
    email.dispose();
    password.dispose();
    super.dispose();
  }

  Future<void> submit() async {
    if (name.text.trim().isEmpty ||
        email.text.trim().isEmpty ||
        password.text.length < 8) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text(
              'Enter a name, email and password of at least 8 characters.')));
      return;
    }
    setState(() => busy = true);
    final error = await ref
        .read(authProvider.notifier)
        .register(name.text.trim(), email.text.trim(), password.text);
    if (!mounted) return;
    setState(() => busy = false);
    if (error != null) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(error)));
      return;
    }
    ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Account created. Sign in to continue.')));
    context.go('/login');
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(
            title: Text(localized(ref.watch(appLanguageProvider),
                'Create account', 'खाता बनाएँ'))),
        body: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            TextField(
                controller: name,
                textInputAction: TextInputAction.next,
                decoration: InputDecoration(
                    labelText: localized(ref.watch(appLanguageProvider),
                        'Full name', 'पूरा नाम'))),
            const SizedBox(height: 12),
            TextField(
                controller: email,
                keyboardType: TextInputType.emailAddress,
                decoration: InputDecoration(
                    labelText: localized(
                        ref.watch(appLanguageProvider), 'Email', 'ईमेल'))),
            const SizedBox(height: 12),
            TextField(
                controller: password,
                obscureText: true,
                decoration: InputDecoration(
                    labelText: localized(ref.watch(appLanguageProvider),
                        'Password', 'पासवर्ड'))),
            const SizedBox(height: 20),
            FilledButton(
                onPressed: busy ? null : submit,
                child: busy
                    ? const CircularProgressIndicator()
                    : Text(localized(ref.watch(appLanguageProvider),
                        'Create citizen account', 'नागरिक खाता बनाएँ'))),
          ],
        ),
      );
}

class AppShell extends ConsumerWidget {
  const AppShell({required this.child, super.key});
  final Widget child;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final language = ref.watch(appLanguageProvider);
    String text(String english, String hindi) =>
        localized(language, english, hindi);
    final path = GoRouterState.of(context).uri.path;
    final index = path == '/reports'
        ? 1
        : path == '/notifications'
            ? 2
            : path == '/profile'
                ? 3
                : 0;
    return Scaffold(
        body: child,
        bottomNavigationBar: NavigationBar(
            selectedIndex: index,
            onDestinationSelected: (value) {
              context.go(
                  ['/home', '/reports', '/notifications', '/profile'][value]);
            },
            destinations: [
              NavigationDestination(
                  icon: Icon(Icons.home_outlined),
                  selectedIcon: Icon(Icons.home),
                  label: text('Home', 'होम')),
              NavigationDestination(
                  icon: Icon(Icons.assignment_outlined),
                  selectedIcon: Icon(Icons.assignment),
                  label: text('My reports', 'मेरी रिपोर्ट')),
              NavigationDestination(
                  icon: Icon(Icons.notifications_outlined),
                  selectedIcon: Icon(Icons.notifications),
                  label: text('Updates', 'अपडेट')),
              NavigationDestination(
                  icon: Icon(Icons.person_outline),
                  selectedIcon: Icon(Icons.person),
                  label: text('Profile', 'प्रोफ़ाइल')),
            ]));
  }
}

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authProvider).user;
    final language = ref.watch(appLanguageProvider);
    String text(String english, String hindi) =>
        localized(language, english, hindi);
    return Scaffold(
        appBar: AppBar(title: const Text('Civix')),
        body: ListView(padding: const EdgeInsets.all(20), children: [
          Text(
              '${text('Hello', 'नमस्ते')}, ${user?.name ?? text('citizen', 'नागरिक')}',
              style: Theme.of(context).textTheme.headlineSmall),
          const SizedBox(height: 8),
          Text(text(
              'Your local knowledge can help universities and partners build practical solutions.',
              'आपकी स्थानीय जानकारी विश्वविद्यालयों और भागीदारों को समाधान बनाने में मदद कर सकती है।')),
          const SizedBox(height: 24),
          Card(
              child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(Icons.campaign,
                            size: 34, color: Color(0xff087bdb)),
                        const SizedBox(height: 12),
                        Text(text('Report a challenge', 'समस्या रिपोर्ट करें'),
                            style: Theme.of(context).textTheme.titleLarge),
                        const SizedBox(height: 6),
                        Text(text(
                            'Share what is happening, where it is happening and what evidence you have.',
                            'बताएँ कि क्या हो रहा है, कहाँ हो रहा है और आपके पास कौन से प्रमाण हैं।')),
                        const SizedBox(height: 16),
                        FilledButton.icon(
                            onPressed: () => context.go('/report'),
                            icon: const Icon(Icons.add),
                            label: Text(
                                text('Start a report', 'रिपोर्ट शुरू करें'))),
                      ]))),
          const SizedBox(height: 16),
          OutlinedButton.icon(
              onPressed: () => context.go('/reports'),
              icon: const Icon(Icons.history),
              label: Text(text('Track my reports', 'मेरी रिपोर्ट देखें'))),
        ]));
  }
}

class ReportScreen extends ConsumerStatefulWidget {
  const ReportScreen({super.key});
  @override
  ConsumerState<ReportScreen> createState() => _ReportScreenState();
}

class _ReportScreenState extends ConsumerState<ReportScreen> {
  final title = TextEditingController();
  final description = TextEditingController();
  String domain = 'other';
  String? district;
  Position? position;
  List<String> attachments = [];
  bool busy = false;
  late final String submissionKey =
      'mobile-${DateTime.now().microsecondsSinceEpoch}';

  @override
  void initState() {
    super.initState();
    _restoreDraft();
  }

  Future<void> _restoreDraft() async {
    final draft = await ref.read(draftStoreProvider).latest();
    if (!mounted || draft == null) return;
    title.text = draft.title;
    description.text = draft.description;
    setState(() {
      domain = draft.domain;
      district = draft.districtId;
    });
  }

  @override
  void dispose() {
    title.dispose();
    description.dispose();
    super.dispose();
  }

  Future<void> saveDraft() async {
    await ref.read(draftStoreProvider).save(Draft(
        title: title.text,
        description: description.text,
        domain: domain,
        districtId: district,
        latitude: position?.latitude,
        longitude: position?.longitude));
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Draft saved on this device.')));
    }
  }

  Future<void> selectPhoto() async {
    final file = await ImagePicker()
        .pickImage(source: ImageSource.gallery, imageQuality: 80);
    if (file != null && mounted) {
      setState(() => attachments = [...attachments, file.path]);
    }
  }

  Future<void> selectDocument() async {
    final files = await FilePicker.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['pdf', 'jpg', 'jpeg', 'png', 'mp4']);
    if (files.isNotEmpty && mounted) {
      setState(() => attachments = [
            ...attachments,
            files.single.path ?? files.single.name
          ]);
    }
  }

  Future<void> locate() async {
    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.denied ||
        permission == LocationPermission.deniedForever) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
            content: Text(
                'Location permission denied. You can continue with district and locality.')));
      }
      return;
    }
    setState(() => busy = true);
    try {
      final value = await Geolocator.getCurrentPosition();
      if (mounted) {
        setState(() {
          position = value;
          busy = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() => busy = false);
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
            content:
                Text('Location is unavailable. You can continue without it.')));
      }
    }
  }

  Future<void> submit() async {
    if (title.text.trim().length < 10 || description.text.trim().length < 30) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text(
              'Title needs 10 characters and description needs 30 characters.')));
      return;
    }
    setState(() => busy = true);
    try {
      final api = ref.read(apiClientProvider);
      final attachmentIds = <String>[];
      for (final path in attachments) {
        if (path.contains('\\') || path.contains('/')) {
          attachmentIds.add(await api.uploadAttachment(path));
        }
      }
      await api.createProblem(
          title: title.text.trim(),
          description: description.text.trim(),
          domain: domain,
          districtId: district,
          latitude: position?.latitude,
          longitude: position?.longitude,
          attachmentIds: attachmentIds,
          idempotencyKey: submissionKey);
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('Report submitted.')));
        context.go('/reports');
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('Could not submit: $error')));
      }
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
      appBar: AppBar(
          title: Text(localized(ref.watch(appLanguageProvider),
              'Report a challenge', 'समस्या रिपोर्ट करें')),
          actions: [
            IconButton(
                onPressed: saveDraft,
                icon: const Icon(Icons.save_outlined),
                tooltip: localized(ref.watch(appLanguageProvider), 'Save draft',
                    'ड्राफ़्ट सहेजें'))
          ]),
      body: ListView(padding: const EdgeInsets.all(20), children: [
        TextField(
            controller: title,
            maxLength: 150,
            decoration: InputDecoration(
                labelText: localized(ref.watch(appLanguageProvider),
                    'What is the challenge?', 'समस्या क्या है?'),
                hintText: localized(
                    ref.watch(appLanguageProvider),
                    'Example: Drinking water pump is broken',
                    'उदाहरण: पीने के पानी का पंप खराब है'))),
        const SizedBox(height: 12),
        TextField(
            controller: description,
            minLines: 5,
            maxLines: 9,
            maxLength: 10000,
            decoration: InputDecoration(
                labelText: localized(ref.watch(appLanguageProvider),
                    'Describe what is happening', 'क्या हो रहा है, बताएँ'))),
        const SizedBox(height: 12),
        DropdownButtonFormField<String>(
            initialValue: domain,
            decoration: InputDecoration(
                labelText: localized(
                    ref.watch(appLanguageProvider), 'Domain', 'क्षेत्र')),
            items: const [
              'other',
              'education',
              'healthcare',
              'agriculture',
              'water',
              'sanitation',
              'environment',
              'energy',
              'urban_development',
              'accessibility',
              'public_administration',
              'rural_livelihoods'
            ]
                .map((value) => DropdownMenuItem(
                    value: value, child: Text(value.replaceAll('_', ' '))))
                .toList(),
            onChanged: (value) => setState(() => domain = value ?? domain)),
        const SizedBox(height: 12),
        TextField(
            decoration: InputDecoration(
                labelText: localized(
                    ref.watch(appLanguageProvider),
                    'District or locality (optional)',
                    'जिला या स्थान (वैकल्पिक)')),
            onChanged: (value) =>
                district = value.trim().isEmpty ? null : value.trim()),
        const SizedBox(height: 12),
        Row(children: [
          Expanded(
              child: OutlinedButton.icon(
                  onPressed: busy ? null : locate,
                  icon: const Icon(Icons.location_on_outlined),
                  label: Text(position == null
                      ? localized(ref.watch(appLanguageProvider),
                          'Use my location', 'मेरा स्थान लें')
                      : localized(ref.watch(appLanguageProvider),
                          'Location added', 'स्थान जोड़ा गया')))),
          const SizedBox(width: 8),
          Expanded(
              child: OutlinedButton.icon(
                  onPressed: selectPhoto,
                  icon: const Icon(Icons.photo_outlined),
                  label: Text(localized(ref.watch(appLanguageProvider),
                      'Add photo', 'फ़ोटो जोड़ें'))))
        ]),
        const SizedBox(height: 8),
        OutlinedButton.icon(
            onPressed: selectDocument,
            icon: const Icon(Icons.attach_file),
            label: Text(localized(ref.watch(appLanguageProvider),
                'Add document or video', 'दस्तावेज़ या वीडियो जोड़ें'))),
        if (attachments.isNotEmpty) ...[
          const SizedBox(height: 8),
          Text('${attachments.length} attachment(s) selected',
              style: Theme.of(context).textTheme.bodySmall)
        ],
        const SizedBox(height: 24),
        FilledButton(
            onPressed: busy ? null : submit,
            child: busy
                ? const CircularProgressIndicator()
                : Text(localized(ref.watch(appLanguageProvider),
                    'Submit report', 'रिपोर्ट जमा करें'))),
        TextButton(
            onPressed: saveDraft,
            child: Text(localized(ref.watch(appLanguageProvider),
                'Save and finish later', 'सहेजें और बाद में पूरा करें'))),
      ]));
}

class MyReportsScreen extends ConsumerWidget {
  const MyReportsScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final reports = ref.watch(problemsProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('My reports')),
      body: reports.when(
        data: (items) {
          if (items.isEmpty) {
            return const Center(
                child: Text('You have not submitted a report yet.'));
          }
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(problemsProvider),
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: items.length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (_, index) {
                final item = items[index];
                return Card(
                    child: ListTile(
                        title: Text(item.title),
                        subtitle: Text('${item.domain} • ${item.status}'),
                        trailing: const Icon(Icons.chevron_right),
                        onTap: () => _showDetails(context, item)));
              },
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(
            child: Padding(
                padding: const EdgeInsets.all(20),
                child: Text('Could not load reports. Pull to retry.\n$error',
                    textAlign: TextAlign.center))),
      ),
    );
  }

  void _showDetails(BuildContext context, Problem item) => showModalBottomSheet(
      context: context,
      showDragHandle: true,
      builder: (_) => Padding(
          padding: const EdgeInsets.all(24),
          child: ListView(shrinkWrap: true, children: [
            Text(item.title, style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 8),
            Text(item.description),
            const SizedBox(height: 16),
            Text('Status: ${item.status}'),
            Text('Domain: ${item.domain}')
          ])));
}

class NotificationsScreen extends StatelessWidget {
  const NotificationsScreen({super.key});
  @override
  Widget build(BuildContext context) => Scaffold(
      appBar: AppBar(title: const Text('Updates')),
      body: const Center(child: Text('No new updates.')));
}

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authProvider).user;
    final language = ref.watch(appLanguageProvider);
    String text(String english, String hindi) =>
        localized(language, english, hindi);
    return Scaffold(
        appBar: AppBar(title: Text(text('Profile', 'प्रोफ़ाइल'))),
        body: ListView(padding: const EdgeInsets.all(20), children: [
          CircleAvatar(
              radius: 34,
              child: Text((user?.name.isNotEmpty ?? false)
                  ? user!.name[0].toUpperCase()
                  : '?')),
          const SizedBox(height: 12),
          Text(user?.name ?? '',
              style: Theme.of(context).textTheme.titleLarge,
              textAlign: TextAlign.center),
          Text(user?.email ?? '', textAlign: TextAlign.center),
          const SizedBox(height: 24),
          ListTile(
              leading: const Icon(Icons.language),
              title: Text(text('Language', 'भाषा')),
              subtitle:
                  Text(language == AppLanguage.english ? 'English' : 'हिंदी'),
              trailing: Switch(
                  value: language == AppLanguage.hindi,
                  onChanged: (hindi) => ref
                      .read(appLanguageProvider.notifier)
                      .state = hindi ? AppLanguage.hindi : AppLanguage.english),
              onTap: () => ref.read(appLanguageProvider.notifier).state =
                  language == AppLanguage.english
                      ? AppLanguage.hindi
                      : AppLanguage.english),
          ListTile(
              leading: const Icon(Icons.help_outline),
              title: Text(text('Help and safety', 'सहायता और सुरक्षा'))),
          const SizedBox(height: 12),
          OutlinedButton.icon(
              onPressed: () => ref.read(authProvider.notifier).logout(),
              icon: const Icon(Icons.logout),
              label: Text(text('Sign out', 'साइन आउट करें'))),
        ]));
  }
}
