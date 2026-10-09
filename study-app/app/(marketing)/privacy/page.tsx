export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-5 p-6">
      <h1 className="text-3xl font-semibold">Privacy · beta draft</h1>
      <p>
        Updated October 9, 2026. Owner must add a contact address and confirm
        this policy before public beta.
      </p>
      <h2>What we keep</h2>
      <p>
        Supabase holds your sign-in account, selected courses, chats, notes,
        packs, quiz work, lessons and subscription status. Class material is
        private to your account. We keep extracted PDF text and source excerpts,
        not original PDF files. Your device keeps downloaded packs and queued
        study edits in IndexedDB.
      </p>
      <h2>Who processes your data</h2>
      <p>
        AI requests send relevant messages, course context and material to
        OpenRouter and its model provider. Supabase hosts your account and study
        data; the app host processes technical requests. Browser speech input
        may send audio to your browser vendor. Device voices vary and may need
        internet. Stripe handles test checkout; we do not store card numbers.
      </p>
      <h2>Optional counts and feedback</h2>
      <p>
        Activity tracking defaults off. If enabled, we store account-linked
        session, pack download and error counters without chat contents, source
        material, IP addresses or full browser histories in our analytics table.
        These are pseudonymous, not fully anonymous. Feedback is sent only when
        you choose Send and is accessible to the project owner.
      </p>
      <h2>Control and deletion</h2>
      <p>
        Turn counters off in the app footer. Delete packs from your account
        online and remove device downloads. Disconnected devices keep copies
        until syncing or clearing browser storage. Account deletion is available
        in Account; server study data linked to it is deleted. Existing backups
        and provider records may follow provider retention policies. The owner
        must publish a retention schedule and support contact before inviting
        students.
      </p>
      <h2>Before sharing</h2>
      <p>
        Do not upload sensitive personal information, someone else’s private
        records, or material you lack permission to use. This independent
        student project is not affiliated with CCNY or CUNY.
      </p>
    </main>
  );
}
