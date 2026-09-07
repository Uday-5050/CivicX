import 'package:flutter_riverpod/flutter_riverpod.dart';

enum AppLanguage { english, hindi }

final appLanguageProvider = StateProvider<AppLanguage>(
  (ref) => AppLanguage.english,
);

String localized(AppLanguage language, String english, String hindi) =>
    language == AppLanguage.hindi ? hindi : english;
