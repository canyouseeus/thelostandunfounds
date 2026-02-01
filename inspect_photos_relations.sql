SELECT constraint_name, table_name, column_name, foreign_table_name, foreign_column_name FROM information_schema.key_column_usage WHERE table_name = 'photos';
