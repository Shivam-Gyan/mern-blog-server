import mongooose from 'mongoose'

const db=()=>mongooose
.connect(process.env.MONGODB_COMPASS)
// .connect(process.env.MONGODB_URI)
.then((_)=>console.log("Database connected succefully "))
.catch(err=>console.log(err.message))


export default db;