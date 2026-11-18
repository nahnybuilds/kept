<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep sitewide icon links in the root head and page-specific sharing metadata in the leaf head; use CDN asset pointers for uploaded artwork and a local ICO for favicon compatibility.
- Derive sitemap static paths from required route inclusion decisions; use the public article collection for dynamic paths so new content is discoverable automatically.
- Keep approved blog articles in one typed, code-backed collection; listing, individual SSR pages, metadata and matching visible FAQ schema derive from it so articles can be added through chat without exposing a public editor.
