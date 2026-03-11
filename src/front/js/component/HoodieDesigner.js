import React,{useState} from "react";
export const HoodieDesigner=({blankImageUrl})=>{
 const[logo,setLogo]=useState(null),[file,setFile]=useState(null),[loading,setLoading]=useState(false);
 const handlePublish=async()=>{
  if(!file)return alert("Upload logo");setLoading(true);
  const fd=new FormData();fd.append("art",file);
  const r=await fetch(process.env.BACKEND_URL+"/api/merch/create",{method:"POST",body:fd,headers:{Authorization:"Bearer "+sessionStorage.getItem("token")}});
  if(r.ok){alert("Published!");setLogo(null);}
  setLoading(false);
 };
 return(<div className="p-3 bg-dark text-white rounded"><div style={{position:"relative",background:"white",display:"inline-block"}}>
 <img src={blankImageUrl||"https://www.printful.com/static/images/layout/default-product-image.png"} width="300" alt="h"/>
 {logo&&<img src={logo} style={{position:"absolute",left:"120px",top:"120px",width:"60px"}} alt="l"/>}</div>
 <input type="file" className="form-control my-2" onChange={e=>{setFile(e.target.files[0]);setLogo(URL.createObjectURL(e.target.files[0]))}}/>
 <button className="btn btn-success w-100" onClick={handlePublish} disabled={loading||!file}>{loading?"...":"Publish"}</button></div>);};