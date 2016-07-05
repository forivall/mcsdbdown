# mcsdbdown

A backend for levelup that uses MCS's Database Access API.

Does not currently support batch or iterator.

Will eventually support iterator since MCS uses `LIKE` instead of `=` for string
columns.
