import React,{useState} from "react";
import {useParams,useNavigate} from "react-router-dom";
export const MerchCheckout=()=>{
 const {product_id}=useParams(),navigate=useNavigate();
 const [size,setSize]=useState("M"),[loading,setLoading]=useState(false);
 const [ship,setShip]=useState({name:"",address1:"",city:"",state:"",zip:"",country:"US"});
 const handleOrder=async(e)=>{
  e.preventDefault();setLoading(true);
  const res=await fetch(process.env.BACKEND_URL+"/api/merch/order",{method:"POST",body:JSON.stringify({product_id,size,shipping:ship}),headers:{"Content-Type":"application/json",Authorization:"Bearer "+sessionStorage.getItem("token")}});
  if(res.ok){alert("Order placed!");navigate("/marketplace");}
  setLoading(false);
 };
 return(<div className="container mt-5 text-white"><div className="row justify-content-center"><div className="col-md-6 bg-dark p-4 rounded border border-secondary">
 <h2 className="text-center">Checkout</h2><form onSubmit={handleOrder}>
 <select className="form-select mb-3" value={size} onChange={e=>setSize(e.target.value)}>{["S","M","L","XL"].map(s=><option key={s} value={s}>{s}</option>)}</select>
 <input className="form-control mb-2" placeholder="Name" required onChange={e=>setShip({...ship,name:e.target.value})}/>
 <input className="form-control mb-2" placeholder="Address" required onChange={e=>setShip({...ship,address1:e.target.value})}/>
 <div className="d-flex gap-2"><input className="form-control" placeholder="City" onChange={e=>setShip({...ship,city:e.target.value})}/><input className="form-control" style={{width:"80px"}} placeholder="ST" onChange={e=>setShip({...ship,state:e.target.value})}/></div>
 <button className="btn btn-primary w-100 mt-3" disabled={loading}>{loading?"Processing...":"Place Order"}</button>
 </form></div></div></div>);};