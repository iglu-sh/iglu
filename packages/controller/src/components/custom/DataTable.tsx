"use client";

import {
    type ColumnDef,
    flexRender,
    getCoreRowModel,
    getPaginationRowModel,
    useReactTable,
} from "@tanstack/react-table";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { ArrowLeft, ArrowRight, LoaderCircle } from "lucide-react";

import {
    Select,
    SelectItem,
    SelectContent,
    SelectTrigger,
    SelectValue,
} from "../ui/select";

interface DataTableProps<TData, TValue, pageIndex, pageSize, noPagination> {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
    pageIndex: pageIndex;
    pageSize: pageSize;
    noPagination: noPagination;
}

export function DataTable<TData, TValue>({
    columns,
    data,
    pageIndex,
    pageSize,
    noPagination,
    sizeChangeCallback = () => {},
    offsetChangeCallback = () => {},
    isLoading = false,
}: DataTableProps<TData, TValue, number, number, boolean> & {
    sizeChangeCallback?: (newSize: number) => void;
    offsetChangeCallback?: (newOffset: number) => void;
    isLoading?: boolean;
}) {
    if (!pageIndex) {
        pageIndex = 0;
    }
    if (!pageSize) {
        pageSize = 25;
    }
    if (!noPagination) {
        noPagination = false;
    }

    const [pagination, setPagination] = useState({
        pageIndex: pageIndex,
        pageSize: pageSize,
    });

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: !noPagination
            ? getPaginationRowModel()
            : undefined,
        onPaginationChange: !noPagination ? setPagination : undefined,
        state: !noPagination ? { pagination } : undefined,
    });
    useEffect(() => {
        sizeChangeCallback(pagination.pageSize);
        offsetChangeCallback(pagination.pageIndex);
    }, [pagination]);
    const TableMenu = () => {
        if (!noPagination) {
            return (
                <div className="mt-5 mb-5 grid grid-cols-[100px_1fr_100px]">
                    <Button
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                    >
                        <ArrowLeft /> Previous
                    </Button>
                    <div className="flex justify-center">
                        <Select
                            onValueChange={(value) => {
                                table.setPageSize(Number(value));
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue
                                    placeholder={
                                        table.getState().pagination.pageSize
                                    }
                                    defaultValue={
                                        table.getState().pagination.pageSize
                                    }
                                />
                            </SelectTrigger>
                            <SelectContent>
                                {[25, 50, 75, 100].map((pageSize) => (
                                    <SelectItem
                                        key={pageSize}
                                        value={String(pageSize)}
                                    >
                                        {pageSize}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <Button
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                    >
                        Next <ArrowRight />
                    </Button>
                </div>
            );
        } else {
            return <></>;
        }
    };

    return (
        <div>
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => {
                                    return (
                                        <TableHead
                                            key={header.id}
                                            className={
                                                header.index !== 0
                                                    ? "text-right font-bold"
                                                    : "font-bold"
                                            }
                                        >
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                      header.column.columnDef
                                                          .header,
                                                      header.getContext(),
                                                  )}
                                        </TableHead>
                                    );
                                })}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell
                                    colSpan={columns.length}
                                    className="h-24 text-center"
                                >
                                    <LoaderCircle className="animate-spin" />
                                </TableCell>
                            </TableRow>
                        ) : table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={
                                        row.getIsSelected() && "selected"
                                    }
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell
                                            key={cell.id}
                                            className={
                                                cell.column.getIndex() !== 0
                                                    ? "justify-items-end-safe text-right"
                                                    : ""
                                            }
                                        >
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext(),
                                            )}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell
                                    colSpan={columns.length}
                                    className="h-24 text-center"
                                >
                                    No results.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            <TableMenu />
        </div>
    );
}
