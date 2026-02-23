import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, Columns3, Users, Download, Trash2, Group } from 'lucide-react';
import { useSheetDetail } from '@/hooks/useSheetDetail';
import { useSheetRowComments } from '@/hooks/useSheetRowComments';
import { useSheets } from '@/hooks/useSheets';
import { useSheetGroups } from '@/hooks/useSheetGroups';
import { useSheetGroupMembers } from '@/hooks/useSheetGroupMembers';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useAuth } from '@/hooks/useAuth';
import { SkeletonLoader, ConfirmDialog } from '@/components/shared';
import { SheetTable } from './SheetTable';
import { RowCommentPanel } from './RowCommentPanel';
import { EditSheetDialog } from './EditSheetDialog';
import { ManageColumnsDialog } from './ManageColumnsDialog';
import { ManageAccessDialog } from './ManageAccessDialog';
import { ManageGroupsDialog } from './grouping/ManageGroupsDialog';
import { FormatToolbar } from './formatting/FormatToolbar';
import { exportSheetToExcel } from '@/lib/utils/exportSheet';
import { getSheetIcon } from '@/lib/utils/sheetIcons';
import { toast } from 'sonner';
import type { SheetColumn, CellStyle } from '@/types';

interface SheetDetailContentProps {
  sheetId: string;
}

export function SheetDetailContent({ sheetId }: SheetDetailContentProps) {
  const navigate = useNavigate();
  const { user, isAdmin, isViewer } = useAuth();
  const { members: teamMembers } = useTeamMembers();
  const { deleteSheet } = useSheets();
  const {
    sheet, isLoading, rows, rowsLoading,
    members: sheetMembers,
    updateSheet, createRow, updateRow, deleteRow,
    reorderRows, addMember, removeMember,
  } = useSheetDetail(sheetId);

  const {
    comments, commentCounts,
    createComment, deleteComment,
  } = useSheetRowComments(sheetId);

  const { groups: sheetGroups } = useSheetGroups();
  const sheetGroup = sheet?.group_id ? sheetGroups.find(g => g.id === sheet.group_id) : undefined;
  const { groupMembers } = useSheetGroupMembers(sheet?.group_id ?? undefined);

  const [editOpen, setEditOpen] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [accessOpen, setAccessOpen] = useState(false);
  const [groupsOpen, setGroupsOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletingRowId, setDeletingRowId] = useState<string | null>(null);
  const [selectedCell, setSelectedCell] = useState<{ rowId: string; colId: string } | null>(null);
  const [commentRowId, setCommentRowId] = useState<string | null>(null);

  const rowComments = useMemo(
    () => comments.filter(c => c.sheet_row_id === commentRowId),
    [comments, commentRowId],
  );

  if (isLoading || rowsLoading) {
    return <SkeletonLoader variant="table" count={5} />;
  }

  if (!sheet) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Sheet not found</h2>
        <p className="text-sm text-gray-500">Select a sheet from the sidebar.</p>
      </div>
    );
  }

  const isCreator = user?.id === sheet.created_by;
  const canManage = isAdmin || isCreator;
  const readOnly = isViewer;

  const commentRow = commentRowId ? rows.find(r => r.id === commentRowId) : null;
  const commentRowIndex = commentRowId ? rows.findIndex(r => r.id === commentRowId) : -1;

  const handleCellChange = (rowId: string, columnId: string, value: unknown) => {
    const row = rows.find(r => r.id === rowId);
    if (!row) return;
    updateRow({ id: rowId, data: { cells: { ...row.cells, [columnId]: value } } });
  };

  const handleCellFormatChange = (rowId: string, colId: string, style: CellStyle) => {
    const row = rows.find(r => r.id === rowId);
    if (!row) return;
    const merged = { ...(row.cell_formats ?? {}), [colId]: style };
    updateRow({ id: rowId, data: { cell_formats: merged } });
  };

  const handleAddRow = () => {
    const maxSort = rows.length > 0 ? Math.max(...rows.map(r => r.sort_order)) : 0;
    createRow({
      sheet_id: sheet.id,
      cells: {},
      sort_order: maxSort + 1,
      created_by: user!.id,
    });
  };

  const handleDeleteSheet = async () => {
    try {
      await deleteSheet(sheet.id);
      navigate('/sheets');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete sheet');
    }
  };

  const handleSaveColumns = async (columns: SheetColumn[]) => {
    await updateSheet({ columns });
  };

  const handleExport = () => {
    exportSheetToExcel(sheet, rows);
  };

  const handleRowMove = (updates: { id: string; sort_order: number; group_id?: string | null }[]) => {
    reorderRows(updates);
  };

  const handleAutoGroupReorder = async (orderedGroupNames: string[]) => {
    await updateSheet({ auto_group_order: orderedGroupNames });
  };

  const handleColumnResize = (columnId: string, width: number) => {
    const updatedColumns = sheet.columns.map(c =>
      c.id === columnId ? { ...c, width } : c
    );
    updateSheet({ columns: updatedColumns }).catch(() => {});
  };

  // Get current cell format for toolbar
  const selectedRow = selectedCell ? rows.find(r => r.id === selectedCell.rowId) : null;
  const selectedCellFormat = selectedRow && selectedCell
    ? (selectedRow.cell_formats?.[selectedCell.colId] ?? {})
    : {};

  return (
    <>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              {(() => { const Icon = getSheetIcon(sheet.icon); return <Icon className="w-6 h-6 text-gray-400" />; })()}
              {sheet.name}
            </h1>
            {sheet.description && (
              <p className="text-sm text-gray-500 mt-1">{sheet.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-surface-200 rounded-xl hover:bg-surface-100"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </button>
            {canManage && (
              <>
                <button
                  onClick={() => setEditOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-surface-200 rounded-xl hover:bg-surface-100"
                >
                  <Pencil className="w-4 h-4" />
                  <span className="hidden sm:inline">Edit</span>
                </button>
                <button
                  onClick={() => setColumnsOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-surface-200 rounded-xl hover:bg-surface-100"
                >
                  <Columns3 className="w-4 h-4" />
                  <span className="hidden sm:inline">Columns</span>
                </button>
                <button
                  onClick={() => setGroupsOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-surface-200 rounded-xl hover:bg-surface-100"
                >
                  <Group className="w-4 h-4" />
                  <span className="hidden sm:inline">Groups</span>
                </button>
                <button
                  onClick={() => setAccessOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-surface-200 rounded-xl hover:bg-surface-100"
                >
                  <Users className="w-4 h-4" />
                  <span className="hidden sm:inline">Access</span>
                </button>
                <button
                  onClick={() => setDeleting(true)}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 bg-white border border-surface-200 rounded-xl hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Format Toolbar */}
      {selectedCell && !readOnly && (
        <FormatToolbar
          style={selectedCellFormat as CellStyle}
          onChange={(style) => handleCellFormatChange(selectedCell.rowId, selectedCell.colId, style)}
          onClose={() => setSelectedCell(null)}
        />
      )}

      {/* Table + Comment Panel wrapper */}
      <div className="relative flex">
        <div className={`bg-white rounded-xl shadow-sm border border-surface-200 min-w-0 ${commentRow ? 'mr-96' : ''}`} style={{ flex: '1 1 0%' }}>
          <SheetTable
            sheet={sheet}
            columns={sheet.columns}
            rows={rows}
            readOnly={readOnly}
            onCellChange={handleCellChange}
            onAddRow={handleAddRow}
            onDeleteRow={setDeletingRowId}
            selectedCell={selectedCell}
            onSelectCell={setSelectedCell}
            onRowMove={handleRowMove}
            onColumnResize={canManage ? handleColumnResize : undefined}
            onAutoGroupReorder={canManage ? handleAutoGroupReorder : undefined}
            commentCounts={commentCounts}
            onOpenComments={setCommentRowId}
          />
        </div>
        {commentRow && commentRowId && (
          <RowCommentPanel
            sheet={sheet}
            row={commentRow}
            rowIndex={commentRowIndex}
            comments={rowComments}
            teamMembers={teamMembers}
            readOnly={readOnly}
            currentUserId={user!.id}
            isAdmin={isAdmin}
            onAddComment={(content) => {
              createComment({
                sheet_id: sheet.id,
                sheet_row_id: commentRowId,
                content,
                created_by: user!.id,
              });
            }}
            onDeleteComment={deleteComment}
            onClose={() => setCommentRowId(null)}
          />
        )}
      </div>

      {/* Dialogs */}
      {canManage && sheet && (
        <>
          <EditSheetDialog
            open={editOpen}
            onClose={() => setEditOpen(false)}
            onSubmit={async data => { await updateSheet(data); }}
            sheet={sheet}
          />
          <ManageColumnsDialog
            open={columnsOpen}
            onClose={() => setColumnsOpen(false)}
            columns={sheet.columns}
            onSave={handleSaveColumns}
          />
          <ManageGroupsDialog
            open={groupsOpen}
            onClose={() => setGroupsOpen(false)}
            sheet={sheet}
            columns={sheet.columns}
            onSave={async (data) => { await updateSheet(data); }}
          />
          <ManageAccessDialog
            open={accessOpen}
            onClose={() => setAccessOpen(false)}
            creatorId={sheet.created_by}
            sheetMembers={sheetMembers}
            teamMembers={teamMembers}
            onAddMember={async (teamMemberId) => {
              await addMember({ sheet_id: sheet.id, team_member_id: teamMemberId });
            }}
            onRemoveMember={removeMember}
            groupName={sheetGroup?.name}
            groupColor={sheetGroup?.color ?? undefined}
            groupMembers={groupMembers.length > 0 ? groupMembers : undefined}
          />
          <ConfirmDialog
            open={deleting}
            onClose={() => setDeleting(false)}
            onConfirm={handleDeleteSheet}
            title="Delete Sheet"
            message={`Are you sure you want to delete "${sheet.name}"? All rows and data will be permanently deleted.`}
            confirmLabel="Delete"
            destructive
          />
        </>
      )}

      <ConfirmDialog
        open={deletingRowId !== null}
        onClose={() => setDeletingRowId(null)}
        onConfirm={async () => {
          if (deletingRowId) {
            await deleteRow(deletingRowId);
            setDeletingRowId(null);
          }
        }}
        title="Delete Row"
        message="Are you sure you want to delete this row? This action cannot be undone."
        confirmLabel="Delete"
        destructive
      />
    </>
  );
}
