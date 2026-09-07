class User {
  const User(
      {required this.id,
      required this.name,
      required this.email,
      required this.role,
      required this.accountStatus});

  final String id;
  final String name;
  final String email;
  final String role;
  final String accountStatus;

  factory User.fromJson(Map<String, dynamic> json) => User(
        id: '${json['id'] ?? json['_id'] ?? ''}',
        name: '${json['name'] ?? ''}',
        email: '${json['email'] ?? ''}',
        role: '${json['role'] ?? 'citizen'}',
        accountStatus: '${json['accountStatus'] ?? 'active'}',
      );
}

class Problem {
  const Problem(
      {required this.id,
      required this.title,
      required this.description,
      required this.status,
      required this.domain,
      required this.createdAt});

  final String id;
  final String title;
  final String description;
  final String status;
  final String domain;
  final DateTime? createdAt;

  factory Problem.fromJson(Map<String, dynamic> json) => Problem(
        id: '${json['id'] ?? json['_id'] ?? ''}',
        title: '${json['title'] ?? ''}',
        description: '${json['description'] ?? ''}',
        status: '${json['status'] ?? 'submitted'}',
        domain: '${json['domain'] ?? 'other'}',
        createdAt: DateTime.tryParse('${json['createdAt'] ?? ''}'),
      );
}

class Draft {
  const Draft(
      {this.id,
      required this.title,
      required this.description,
      this.domain = 'other',
      this.districtId,
      this.latitude,
      this.longitude,
      this.updatedAt});

  final int? id;
  final String title;
  final String description;
  final String domain;
  final String? districtId;
  final double? latitude;
  final double? longitude;
  final DateTime? updatedAt;

  Map<String, Object?> toJson() => {
        'id': id,
        'title': title,
        'description': description,
        'domain': domain,
        'districtId': districtId,
        'latitude': latitude,
        'longitude': longitude,
        'updatedAt': (updatedAt ?? DateTime.now()).toIso8601String(),
      };

  factory Draft.fromJson(Map<String, Object?> json) => Draft(
        id: json['id'] as int?,
        title: '${json['title'] ?? ''}',
        description: '${json['description'] ?? ''}',
        domain: '${json['domain'] ?? 'other'}',
        districtId: json['districtId'] as String?,
        latitude: (json['latitude'] as num?)?.toDouble(),
        longitude: (json['longitude'] as num?)?.toDouble(),
        updatedAt: DateTime.tryParse('${json['updatedAt'] ?? ''}'),
      );
}
