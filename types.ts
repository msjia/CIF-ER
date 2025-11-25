export interface ColumnDefinition {
  name: string;
  type: string;
  comment: string;
  isPrimaryKey: boolean;
  isNullable: boolean;
}

export interface TableDefinition {
  id: string; // usually same as name
  name: string;
  comment: string;
  columns: ColumnDefinition[];
}

export interface ParsedSchema {
  tables: TableDefinition[];
}

export enum ViewMode {
  EDITOR = 'EDITOR',
  SQL_INPUT = 'SQL_INPUT'
}
