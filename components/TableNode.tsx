import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Key, Columns as ColumnsIcon } from 'lucide-react';
import { ColumnDefinition } from '../types';

interface TableNodeProps {
  data: {
    label: string;
    comment: string;
    columns: ColumnDefinition[];
    selected?: boolean;
    dimmed?: boolean;
  };
}

const TableNode = ({ data }: TableNodeProps) => {
  return (
    <div className={`
      bg-white rounded-lg shadow-lg border-2 min-w-[280px] overflow-hidden transition-all duration-300
      ${data.selected ? 'border-blue-500 ring-4 ring-blue-100 shadow-xl scale-105 z-10' : 'border-slate-200 hover:border-slate-300'}
      ${data.dimmed ? 'opacity-40 grayscale-[0.8] border-slate-100 shadow-sm scale-95' : 'opacity-100'}
    `}>
      {/* Header */}
      <div className={`
        border-b p-3 transition-colors
        ${data.selected ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-100'}
      `}>
        <div className={`font-bold text-sm flex items-center gap-2 ${data.selected ? 'text-blue-700' : 'text-slate-800'}`}>
          <ColumnsIcon size={16} className={data.selected ? 'text-blue-600' : 'text-slate-400'} />
          <span className="truncate" title={data.label}>{data.label}</span>
        </div>
        {data.comment && (
          <div className="text-xs text-slate-500 mt-1 truncate" title={data.comment}>
            {data.comment}
          </div>
        )}
      </div>

      {/* Columns */}
      <div className="max-h-[400px] overflow-y-auto bg-white">
        {data.columns.map((col, index) => (
          <div 
            key={col.name} 
            className={`
              relative flex items-center justify-between px-3 py-2 text-xs border-b border-slate-50 last:border-0
              ${col.isPrimaryKey ? 'bg-yellow-50/50' : ''}
              hover:bg-slate-50
            `}
          >
            {/* Left Handle for incoming connections */}
            <Handle
              type="target"
              position={Position.Left}
              id={`${col.name}-target`}
              className={`!w-2 !h-2 !bg-slate-300 !-left-1 ${data.dimmed ? '!opacity-0' : ''}`}
            />

            <div className="flex items-center gap-2 flex-1 min-w-0">
              {col.isPrimaryKey && <Key size={12} className="text-yellow-600 shrink-0" />}
              <span className={`font-medium truncate ${col.isPrimaryKey ? 'text-yellow-700' : 'text-slate-700'}`} title={col.name}>
                {col.name}
              </span>
            </div>
            
            <div className="flex items-center gap-2 ml-2 shrink-0">
              <span className="text-slate-400 font-mono text-[10px]">{col.type}</span>
              {col.comment && (
                <span className="text-slate-300 truncate max-w-[80px]" title={col.comment}>
                  {/* Only show first few chars of comment */}
                  {col.comment.substring(0, 10)}{col.comment.length > 10 ? '...' : ''}
                </span>
              )}
            </div>

            {/* Right Handle for outgoing connections */}
            <Handle
              type="source"
              position={Position.Right}
              id={`${col.name}-source`}
              className={`!w-2 !h-2 !bg-slate-300 !-right-1 ${data.dimmed ? '!opacity-0' : ''}`}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default memo(TableNode);
