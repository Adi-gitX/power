## Scalable Code Guidelines
These are the guidelines which includes the important guidelines to make sure the code you write is scalable for end user.
1. Concurrency and Multi Threading
   No matter what always write concurrent and multi-threaded code.
   1. Always use async and await in python function. Functions needs to be asynchronous, making use of `async` and `await` consistently. This ensures the ability to handle concurrent requests
   2. If you are using any library use always its async function, most likely the library will have it, if you do not know check the library code in /root/.venv.
   3. use asynchronous requests (`aiohttp` or `httpx` library) to make multiple API calls concurrently.
   4. Write optimal code
   5. Implement smarter content chunking while handling large files. 
   6. Introduce a message queue to handle review requests asynchronously, Given this is a dev env and you dont have qeueue. Make sure to use mongo database as queue if required.
   7. (Optimistic Locking):** Implement optimistic locking to handle potential race conditions when updating review status in the database concurrently. Optimistic locking should be done with retries.
   8. Database Query Optimization - Always make sure you are writing optimized queries, Also Consider creating required indexes in the collection.
   9. Use inmemory or database based caching wherever needed, in-memory cache can only be used for limited items.

2. Performance Bottlenecks & Optimization
   Whenever you work with files ensure that they are handled optimally. 
   1. If they are big in size they have to handle properly.
   2. If it is being downloaded from network then timeout is properly handled.
   3. Always handle recursion smartly and keep a max limit.
   4. Anything which has large timeout always put them into database and then poll asyncronously if required.
   5. Retry should always be present for newtwork call with delay, logs and and backoff if needed.
   6. For large file/code or media always use smarter chunk processing, store intermidate data in database.
   7. Your disk storage is ephemeral, so you can not trust this for permanent data, you must use database for persistant storage.
   8. Whenever you are taking and doing an async task always create an entry in database and then push it to background_tasks fastapi implementation.