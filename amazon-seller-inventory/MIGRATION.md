# Moving StockBook to its own repository

The app is fully self-contained in this folder, and its history is already
separable — nothing here depends on the host repo.

## One-time: create the repo (requires the account owner)

github.com/new → name `amazon-seller-inventory` → **Private** → do NOT add a
README/license (the repo must be empty).

## Then the migration is two commands

From a checkout of `gossii/apps` on branch
`claude/amazon-seller-inventory-app-rnqgks`:

```bash
git subtree split --prefix=amazon-seller-inventory -b standalone-main
git push https://github.com/GOSSII/amazon-seller-inventory standalone-main:main
```

That pushes the app **at repository root with its full commit history**
(every design and build decision, preserved). The nested `.github` workflows
(CI, nightly backup) activate automatically because they land at the root.

## After the push

1. Repo settings → Secrets → add `DATABASE_URL` and `BACKUP_PASSPHRASE`
   (any strong phrase — it encrypts the nightly backups) so backups start.
2. Import the repo in Vercel; set env vars from `.env.example`.
3. Create the Supabase project; paste its URL/keys into Vercel and enable the
   Google provider under Authentication.
4. Retire the staged copy: close PR #6 in `gossii/apps` with a note pointing
   at the new repo.
