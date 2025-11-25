import React, { useCallback, useEffect, useMemo, useState, MouseEvent } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  MarkerType,
  useReactFlow,
  ReactFlowProvider,
} from 'reactflow';
import TableNode from './TableNode';
import { TableDefinition } from '../types';

interface ERDiagramProps {
  tables: TableDefinition[];
}

// Columns to ignore when automatically inferring relationships
const IGNORED_FK_COLUMNS = new Set([
  'COMPANY',
  'TRAN_TIMESTAMP',
  'USER_ID',
  'CREATE_USER_ID',
  'LAST_CHANGE_USER_ID',
  'APPR_USER_ID',
  'AUTH_USER_ID',
  'CREATE_DATE',
  'UPDATE_DATE',
  'LAST_CHANGE_DATE',
  'TRAN_DATE',
  'RUN_DATE',
  'JOB_RUN_ID',
  'BATCH_NO',
  'REMARK',
  'REMARK1',
  'REMARK2',
  'REMARK3',
  'ERROR_CODE',
  'ERROR_DESC'
]);

const getLayoutedNodes = (tables: TableDefinition[]): Node[] => {
  const nodes: Node[] = [];
  const spacingX = 400;
  const spacingY = 400;
  const columns = Math.ceil(Math.sqrt(tables.length)) + 2;

  tables.forEach((table, index) => {
    const x = (index % columns) * spacingX;
    const y = Math.floor(index / columns) * spacingY;

    nodes.push({
      id: table.id,
      type: 'table',
      position: { x, y },
      data: {
        label: table.name,
        comment: table.comment,
        columns: table.columns,
      },
    });
  });

  return nodes;
};

const ERDiagramContent: React.FC<ERDiagramProps> = ({ tables }) => {
  const nodeTypes = useMemo(() => ({ table: TableNode }), []);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const { fitView } = useReactFlow();

  // Initialize nodes and edges when tables change
  useEffect(() => {
    const layoutedNodes = getLayoutedNodes(tables);
    
    const newEdges: Edge[] = [];
    const pkMap = new Map<string, string>(); 
    
    tables.forEach(t => {
        t.columns.forEach(c => {
            if(c.isPrimaryKey && !IGNORED_FK_COLUMNS.has(c.name)) {
                if (c.name.toUpperCase() !== 'ID') {
                    if (c.name === 'CLIENT_NO' && t.name === 'cif_client') {
                        pkMap.set(c.name, t.id);
                    } else if (!pkMap.has(c.name)) {
                        pkMap.set(c.name, t.id);
                    }
                }
            }
        });
    });

    tables.forEach(t => {
        t.columns.forEach(c => {
            if (IGNORED_FK_COLUMNS.has(c.name)) return;
            if (pkMap.has(c.name)) {
                const targetTableId = pkMap.get(c.name);
                if (targetTableId && targetTableId !== t.id) {
                     newEdges.push({
                        id: `e-${t.id}-${c.name}-${targetTableId}`,
                        source: t.id,
                        target: targetTableId,
                        sourceHandle: `${c.name}-source`,
                        targetHandle: `${c.name}-target`, 
                        animated: false,
                        style: { stroke: '#cbd5e1', strokeWidth: 1 },
                        type: 'smoothstep',
                        markerEnd: {
                            type: MarkerType.ArrowClosed,
                            color: '#94a3b8'
                        },
                     });
                }
            }
        });
    });

    setNodes(layoutedNodes);
    setEdges(newEdges);
    setSelectedNodeId(null);
    
    setTimeout(() => fitView({ padding: 0.2 }), 100);

  }, [tables, setNodes, setEdges, fitView]);

  // Create a structural fingerprint for edges to break dependency loops.
  // We only want to recalculate highlighting logic if the connections change, 
  // not when we just update the style of an edge.
  const topologyFingerprint = useMemo(() => {
    return edges.map(e => `${e.source}|${e.target}`).sort().join('||');
  }, [edges]);

  const adjacency = useMemo(() => {
    const map = new Map<string, Set<string>>();
    edges.forEach(e => {
        if(!map.has(e.source)) map.set(e.source, new Set());
        if(!map.has(e.target)) map.set(e.target, new Set());
        map.get(e.source)?.add(e.target);
        map.get(e.target)?.add(e.source);
    });
    return map;
  }, [topologyFingerprint]); // Depends on the fingerprint, not the edges array reference

  const onNodeClick = (_: MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  };

  const onPaneClick = () => {
    setSelectedNodeId(null);
  };

  // Update node and edge styles based on selection
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => {
        const isSelected = node.id === selectedNodeId;
        const isNeighbor = selectedNodeId ? adjacency.get(selectedNodeId)?.has(node.id) : false;
        
        const shouldDim = selectedNodeId !== null && !isSelected && !isNeighbor;

        // Avoid unnecessary object creation if state hasn't changed
        if (node.data.selected === isSelected && node.data.dimmed === shouldDim) {
            return node;
        }

        return {
          ...node,
          data: {
            ...node.data,
            selected: isSelected,
            dimmed: shouldDim,
          },
        };
      })
    );

    setEdges((eds) =>
      eds.map((edge) => {
        const isConnected = selectedNodeId && (edge.source === selectedNodeId || edge.target === selectedNodeId);
        const shouldDim = selectedNodeId !== null && !isConnected;

        const targetStroke = isConnected ? '#3b82f6' : '#cbd5e1';
        const targetWidth = isConnected ? 3 : 1;
        const targetOpacity = shouldDim ? 0.2 : 1;
        const targetColor = isConnected ? '#3b82f6' : (shouldDim ? '#e2e8f0' : '#94a3b8');
        const targetZIndex = isConnected ? 10 : 0;

        // Check equality to prevent needless updates (though React Flow handles this well, explicit checks are safer against loops)
        if (
            edge.animated === isConnected &&
            edge.style?.stroke === targetStroke &&
            edge.style?.strokeWidth === targetWidth &&
            edge.style?.opacity === targetOpacity &&
            edge.markerEnd?.['color'] === targetColor &&
            edge.zIndex === targetZIndex
        ) {
            return edge;
        }

        return {
          ...edge,
          animated: isConnected,
          style: {
            ...edge.style,
            stroke: targetStroke,
            strokeWidth: targetWidth,
            opacity: targetOpacity,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: targetColor,
          },
          zIndex: targetZIndex,
        };
      })
    );
  }, [selectedNodeId, adjacency, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ 
        ...params, 
        animated: true, 
        style: { stroke: '#3b82f6', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed }
    }, eds)),
    [setEdges]
  );

  return (
    <div className="w-full h-full bg-slate-50">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.1}
        maxZoom={1.5}
        className="bg-slate-50"
      >
        <Background gap={20} size={1} color="#cbd5e1" />
        <Controls />
        <MiniMap 
            nodeColor={(n) => n.data.selected ? '#3b82f6' : '#e2e8f0'}
            maskColor="rgba(241, 245, 249, 0.7)"
            className="border border-slate-200 rounded-lg shadow-sm bg-white"
        />
      </ReactFlow>
    </div>
  );
};

const ERDiagram: React.FC<ERDiagramProps> = (props) => (
    <ReactFlowProvider>
        <ERDiagramContent {...props} />
    </ReactFlowProvider>
);

export default ERDiagram;