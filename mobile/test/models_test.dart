import 'package:flutter_test/flutter_test.dart';
import 'package:civix_mobile/core/models/models.dart';

void main() {
  test('parses a problem using the API envelope shape', () {
    final problem = Problem.fromJson({
      'id': 'p-1',
      'title': 'Broken water pump',
      'description': 'The pump has been broken for two weeks.',
      'domain': 'water',
      'status': 'submitted',
      'analysis': {
        'status': 'fallback',
        'category': 'Public services',
        'priority': 'medium',
        'provider': 'rules-fallback',
        'revision': 2,
      },
      'createdAt': '2026-09-06T10:00:00Z',
    });

    expect(problem.id, 'p-1');
    expect(problem.status, 'submitted');
    expect(problem.createdAt?.year, 2026);
    expect(problem.analysis.status, 'fallback');
    expect(problem.analysis.provider, 'rules-fallback');
    expect(problem.analysis.revision, 2);
  });

  test('draft round trips its local persistence shape', () {
    final draft = Draft(
        title: 'A report',
        description: 'A description long enough to save.',
        districtId: 'ranchi');
    final restored = Draft.fromJson(draft.toJson());
    expect(restored.title, draft.title);
    expect(restored.description, draft.description);
    expect(restored.districtId, 'ranchi');
  });

  test('voice report draft preserves multilingual generated content', () {
    final draft = VoiceReportDraft.fromJson({
      'transcript': 'हमारे क्षेत्र में पानी नहीं आ रहा है।',
      'languageCode': 'hi-IN',
      'languageName': 'Hindi',
      'title': 'क्षेत्र में पानी की समस्या',
      'description': 'हमारे क्षेत्र में दो दिनों से पानी नहीं आ रहा है।',
      'domain': 'infrastructure',
    });

    expect(draft.languageCode, 'hi-IN');
    expect(draft.title, 'क्षेत्र में पानी की समस्या');
    expect(draft.description, contains('दो दिनों'));
    expect(draft.domain, 'infrastructure');
  });
}
