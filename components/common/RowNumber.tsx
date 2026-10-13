import { TableCell, TableHead } from "@/components/ui/table";

export function SttHead() {
  return <TableHead className="w-14 text-center">STT</TableHead>;
}

export function SttCell({ n }: { n: number }) {
  return (
    <TableCell className="text-center tabular-nums text-muted-foreground" data-testid="stt">
      {n}
    </TableCell>
  );
}
