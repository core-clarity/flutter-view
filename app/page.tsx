import { Workspace } from "@/components/workspace/Workspace";
import { DEFAULT_WORKSPACE_ID } from "@/lib/db/constants";
import { loadWorkspaceBundle } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function Page() {
  const data = await loadWorkspaceBundle(DEFAULT_WORKSPACE_ID);

  return (
    <Workspace
      initialDepartments={data.departments}
      initialCandidates={data.candidates}
      initialBprStages={data.bprStages}
      workspace={data.workspace}
      contextNotes={data.contextNotes}
      managementPolicies={data.managementPolicies}
      systems={data.systems}
      bizSysLinks={data.bizSysLinks}
    />
  );
}
