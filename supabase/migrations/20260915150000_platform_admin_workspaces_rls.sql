-- SoloOS: Allow platform admins to select from workspaces and workspace_members for administrative oversight

DROP POLICY IF EXISTS workspaces_select_member ON public.workspaces;
CREATE POLICY workspaces_select_member ON public.workspaces FOR SELECT TO authenticated
  USING (public.is_workspace_member(id) OR public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS members_select_same_workspace ON public.workspace_members;
CREATE POLICY members_select_same_workspace ON public.workspace_members FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id) OR public.is_platform_admin(auth.uid()));
