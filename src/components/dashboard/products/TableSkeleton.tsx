import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  Table
} from "@/components/ui/table";

export const TableSkeleton = () => { 
    return (
  <div className="space-y-4">
    <div className="hidden sm:block">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead><Skeleton className="h-6 w-20" /></TableHead>
            <TableHead><Skeleton className="h-6 w-16" /></TableHead>
            <TableHead className="hidden md:table-cell"><Skeleton className="h-6 w-16" /></TableHead>
            <TableHead><Skeleton className="h-6 w-16" /></TableHead>
            <TableHead><Skeleton className="h-6 w-24" /></TableHead>
            <TableHead><Skeleton className="h-6 w-32" /></TableHead>
            <TableHead><Skeleton className="h-6 w-24" /></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array(5).fill(0).map((_, index) => (
            <TableRow key={index}>
              <TableCell><Skeleton className="h-4 w-32" /></TableCell>
              <TableCell><Skeleton className="h-4 w-20" /></TableCell>
              <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-16" /></TableCell>
              <TableCell><Skeleton className="h-4 w-16" /></TableCell>
              <TableCell><Skeleton className="h-4 w-24" /></TableCell>
              <TableCell><Skeleton className="h-4 w-32" /></TableCell>
              <TableCell><Skeleton className="h-8 w-24" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
    <div className="block sm:hidden space-y-4">
      {Array(5).fill(0).map((_, index) => (
        <Card key={index} className="p-4">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-8 w-24" />
          </div>
        </Card>
      ))}
    </div>
  </div>
);
}
