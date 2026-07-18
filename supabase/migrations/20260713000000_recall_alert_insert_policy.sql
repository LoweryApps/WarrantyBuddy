-- Allows the Add Product flow's client-side post-save recall check
-- (Section 4.3 Step 4) to record a match it finds. Safe because a user can
-- only create an alert row for a product they already own, pointing at an
-- existing (globally readable) recall — no cross-user data exposure.

create policy "Users can create recall alerts for their own products"
  on public.user_recall_alerts for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.products
      where products.id = user_recall_alerts.product_id
        and products.user_id = auth.uid()
    )
  );
