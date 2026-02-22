# JIIT LRC Map 📚

### What is this?
Ever spent 20 minutes looking for a book in the JIIT library only to realize it's in a completely different corner? Yeah, same. 

This project is a quick-and-dirty way to search for books and see exactly which shelf they are on. It's not "enterprise ready" or "industry grade" — it’s just something that works.

### Live Site
You can use the portal right here: [**https://lrc-map.vercel.app/**](https://lrc-map.vercel.app/)

### How it works:
1. **Scraper**: A Python script (in the old parent repo) crawled the library collection to grab book names and shelf numbers.
2. **Database**: A Supabase setup stores the 47k+ books so searching is fast.
3. **Web Portal**: This Next.js site where you can type a book name and see the map.

### Setup (The TL;DR version)
If you want to run this locally:
- Clone the repo.
- Run `npm install`.
- Set up your `.env.local` with Supabase keys.
- Run `npm run dev`.

### Disclaimer
I made this to save time. If the library reshuffles all their books next week, the map will be wrong until the database is updated.

Happy hunting! 📖
