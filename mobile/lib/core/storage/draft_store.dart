import 'dart:convert';

import 'package:path/path.dart' as path;
import 'package:sqflite/sqflite.dart';

import '../models/models.dart';

class DraftStore {
  Database? _database;

  Future<Database> get database async {
    if (_database != null) return _database!;
    final location = path.join(await getDatabasesPath(), 'civix.db');
    _database =
        await openDatabase(location, version: 1, onCreate: (db, _) async {
      await db.execute(
          'CREATE TABLE drafts (id INTEGER PRIMARY KEY AUTOINCREMENT, payload TEXT NOT NULL, updated_at TEXT NOT NULL)');
    });
    return _database!;
  }

  Future<int> save(Draft draft) async {
    final db = await database;
    final payload = jsonEncode(draft.toJson());
    if (draft.id == null) {
      return db.insert('drafts',
          {'payload': payload, 'updated_at': DateTime.now().toIso8601String()});
    }
    await db.update('drafts',
        {'payload': payload, 'updated_at': DateTime.now().toIso8601String()},
        where: 'id = ?', whereArgs: [draft.id]);
    return draft.id!;
  }

  Future<List<Draft>> all() async {
    final rows =
        await (await database).query('drafts', orderBy: 'updated_at DESC');
    return rows.map((row) {
      final json =
          jsonDecode(row['payload']! as String) as Map<String, dynamic>;
      json['id'] = row['id'];
      return Draft.fromJson(json);
    }).toList();
  }

  Future<Draft?> latest() async {
    final rows = await (await database)
        .query('drafts', orderBy: 'updated_at DESC', limit: 1);
    if (rows.isEmpty) return null;
    final json =
        jsonDecode(rows.first['payload']! as String) as Map<String, dynamic>;
    json['id'] = rows.first['id'];
    return Draft.fromJson(json);
  }

  Future<void> delete(int id) async =>
      (await database).delete('drafts', where: 'id = ?', whereArgs: [id]);
}
