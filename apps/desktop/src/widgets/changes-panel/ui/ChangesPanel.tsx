import { useQuery } from "@tanstack/react-query";
import { AlertCircle, FolderGit2, GitCommit, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@yoophi/ui/components/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@yoophi/ui/components/table";
import {
  getAppInfo,
  listHistory,
  repositoryKeys,
  type Repository,
} from "@/entities/repository";

type ChangesPanelProps = {
  selectedRepository?: Repository;
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function getShortHash(hash: string) {
  return hash.slice(0, 8);
}

export function ChangesPanel({ selectedRepository }: ChangesPanelProps) {
  const appInfo = useQuery({
    queryKey: ["app-info"],
    queryFn: getAppInfo,
  });
  const historyQuery = useQuery({
    enabled: Boolean(selectedRepository),
    queryKey: selectedRepository
      ? repositoryKeys.history(selectedRepository.id)
      : ["repositories", "unselected", "history"],
    queryFn: () => listHistory(selectedRepository?.id ?? ""),
  });

  return (
    <section className="flex h-full min-h-0 flex-col">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <GitCommit className="size-4 text-muted-foreground" />
          <div className="min-w-0">
            <h2 className="truncate text-sm font-medium">
              {selectedRepository?.name ?? "Working Tree"}
            </h2>
            <p className="truncate text-xs text-muted-foreground">
              {selectedRepository?.path ??
                (appInfo.data
                  ? `${appInfo.data.name} ${appInfo.data.version}`
                  : "Loading app info")}
            </p>
          </div>
        </div>
        <Button
          size="icon-sm"
          variant="outline"
          aria-label="Refresh history"
          disabled={!selectedRepository || historyQuery.isFetching}
          onClick={() => void historyQuery.refetch()}
        >
          {historyQuery.isFetching ? <Loader2 className="animate-spin" /> : <RefreshCw />}
        </Button>
      </header>
      <div className="min-h-0 flex-1 overflow-auto p-4">
        {!selectedRepository ? (
          <div className="flex h-full min-h-80 items-center justify-center">
            <div className="max-w-sm text-center">
              <FolderGit2 className="mx-auto size-10 text-muted-foreground" />
              <h2 className="mt-3 text-sm font-medium">No repository selected</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Add a local Git repository from the sidebar, then select it to inspect its state.
              </p>
            </div>
          </div>
        ) : historyQuery.isLoading ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading history
          </p>
        ) : historyQuery.isError ? (
          <p className="flex items-start gap-1.5 text-sm leading-5 text-red-600">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{getErrorMessage(historyQuery.error)}</span>
          </p>
        ) : historyQuery.data?.length === 0 ? (
          <div className="flex h-full min-h-80 items-center justify-center">
            <div className="max-w-sm text-center">
              <GitCommit className="mx-auto size-10 text-muted-foreground" />
              <h2 className="mt-3 text-sm font-medium">No commits found</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                This repository does not have commit history to display.
              </p>
            </div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-28">Hash</TableHead>
                <TableHead>Message</TableHead>
                <TableHead className="w-48">Author</TableHead>
                <TableHead className="w-52">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {historyQuery.data?.map((commit) => (
                <TableRow key={commit.hash}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {getShortHash(commit.hash)}
                  </TableCell>
                  <TableCell className="max-w-0 truncate">{commit.message}</TableCell>
                  <TableCell className="max-w-0 truncate text-muted-foreground">
                    {commit.author}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {commit.date}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </section>
  );
}
