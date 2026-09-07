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
      'createdAt': '2026-09-06T10:00:00Z',
    });

    expect(problem.id, 'p-1');
    expect(problem.status, 'submitted');
    expect(problem.createdAt?.year, 2026);
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
}
