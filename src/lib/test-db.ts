import db from './db';
import { users } from './schema';

console.log(db.select().from(users).limit(1))