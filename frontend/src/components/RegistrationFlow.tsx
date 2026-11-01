import { useState } from 'react';
import { ArrowLeft, ArrowRight, CalendarDays, Check, CheckCircle2, MapPin, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../services/api';
import type { Event, Registration, RegistrationInput } from '../types';

const departments = ['Computer Science and Engineering','Information Technology','Electronics and Communication Engineering','Electrical and Electronics Engineering','Mechanical Engineering','Civil Engineering','Other'];
const years = ['1st Year','2nd Year','3rd Year','4th Year','5th Year','Graduate'];
type Field = keyof RegistrationInput;

export default function RegistrationFlow({ event, close, onSuccess }: { event: Event; close: () => void; onSuccess: () => Promise<void> }) {
  const navigate = useNavigate();
  const [step,setStep]=useState<'details'|'review'|'success'>('details');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [errors,setErrors]=useState<Record<string,string>>({});
  const [saved,setSaved]=useState<Registration|null>(null);
  const [form,setForm]=useState<RegistrationInput>({eventId:event.id,fullName:'',studentId:'',collegeEmail:'',department:'',academicYear:'',phone:'',additionalInfo:''});
  const set=(key:Field,value:string)=>setForm(current=>({...current,[key]:value}));
  function validate(){
    const next:Record<string,string>={};
    if(form.fullName.trim().length<2)next.fullName='Enter your full name.';
    if(form.studentId.trim().length<2)next.studentId='Enter your student ID.';
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.collegeEmail.trim()))next.collegeEmail='Enter a valid college email.';
    if(!form.department)next.department='Choose your department.';
    if(!form.academicYear)next.academicYear='Choose your academic year.';
    if(form.phone?.trim()&&!/^\+?[0-9][0-9 ()-]{6,19}$/.test(form.phone.trim()))next.phone='Enter a valid phone number.';
    if((form.additionalInfo?.length||0)>1000)next.additionalInfo='Keep this under 1,000 characters.';
    setErrors(next);return Object.keys(next).length===0;
  }
  async function confirm(){setBusy(true);setError('');setErrors({});try{const result=await api.register({...form,fullName:form.fullName.trim(),studentId:form.studentId.trim(),collegeEmail:form.collegeEmail.trim(),phone:form.phone?.trim(),additionalInfo:form.additionalInfo?.trim()});setSaved(result);await onSuccess();setStep('success')}catch(err){if(err instanceof ApiError){setError(err.message);if(err.fields)setErrors(err.fields)}else setError('Could not complete registration. Check your connection and try again.')}finally{setBusy(false)}}
  const value=(key:Field)=>String(form[key]||'');
  return <div className="modal-scrim registration-scrim" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)close()}}><section className="registration-modal" role="dialog" aria-modal="true" aria-labelledby="registration-title">
    <header className="registration-modal-head"><div><div className="eyebrow">EVENT REGISTRATION</div><h2 id="registration-title">{step==='success'?'You’re on the list!':'Save your spot'}</h2></div>{step!=='success'&&<button type="button" className="icon-btn pale" aria-label="Close registration" onClick={close}><X size={18}/></button>}</header>
    {step!=='success'&&<div className="registration-progress"><div className={step==='details'?'current done':''}><span>{step==='review'?<Check size={13}/>:1}</span>Details</div><i/><div className={step==='review'?'current':''}><span>2</span>Review</div><i/><div><span>3</span>Confirmation</div></div>}
    {step==='details'&&<form className="registration-form" onSubmit={e=>{e.preventDefault();if(validate())setStep('review')}} noValidate>
      <div className="registration-event-summary"><span className="category-tag">{event.category}</span><b>{event.title}</b><small><CalendarDays size={13}/>{new Date(`${event.eventDate}T12:00:00`).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})} · {event.eventTime} <MapPin size={13}/>{event.venue}</small></div>
      <p className="required-note">Your details <span>* required</span></p>
      <div className="form-two"><FormInput label="Full name" field="fullName" value={value('fullName')} set={set} error={errors.fullName} placeholder="As shown on your student ID"/><FormInput label="Student ID" field="studentId" value={value('studentId')} set={set} error={errors.studentId} placeholder="e.g. STUDENT001"/></div>
      <FormInput label="College email" field="collegeEmail" value={value('collegeEmail')} set={set} error={errors.collegeEmail} placeholder="you@college.edu" type="email"/>
      <div className="form-two"><label>Department <Required/><select value={form.department} onChange={e=>set('department',e.target.value)} aria-invalid={!!errors.department}><option value="">Select department</option>{departments.map(x=><option key={x}>{x}</option>)}</select>{errors.department&&<small className="field-error">{errors.department}</small>}</label><label>Academic year <Required/><select value={form.academicYear} onChange={e=>set('academicYear',e.target.value)} aria-invalid={!!errors.academicYear}><option value="">Select year</option>{years.map(x=><option key={x}>{x}</option>)}</select>{errors.academicYear&&<small className="field-error">{errors.academicYear}</small>}</label></div>
      <div className="form-two"><FormInput label="Phone number" field="phone" value={value('phone')} set={set} error={errors.phone} placeholder="Optional" type="tel" required={false}/><label>Additional information <small className="optional-label">Optional</small><textarea rows={2} maxLength={1000} value={form.additionalInfo} onChange={e=>set('additionalInfo',e.target.value)} placeholder="Anything the organiser should know?"/>{errors.additionalInfo&&<small className="field-error">{errors.additionalInfo}</small>}</label></div>
      <p className="demo-identity-note">This form records the details you provide; it does not verify student identity.</p>
      {error&&<p className="inline-error" role="alert">{error}</p>}
      <div className="modal-actions"><button type="button" className="btn secondary" onClick={close}>Cancel</button><button className="btn primary">Review registration <ArrowRight size={15}/></button></div>
    </form>}
    {step==='review'&&<div className="registration-review"><div className="review-event"><span className="category-tag">{event.category}</span><h3>{event.title}</h3><p><CalendarDays size={14}/>{new Date(`${event.eventDate}T12:00:00`).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})} · {event.eventTime}</p><p><MapPin size={14}/>{event.venue}</p></div><div className="review-grid">{[['Full name',form.fullName],['Student ID',form.studentId],['College email',form.collegeEmail],['Department',form.department],['Academic year',form.academicYear],['Phone',form.phone||'Not provided'],['Additional information',form.additionalInfo||'None']].map(([label,val])=><div key={label}><small>{label}</small><b>{val}</b></div>)}</div><p className="demo-identity-note">Confirming saves this registration. Student details are self-reported and are not verified.</p>{error&&<p className="inline-error" role="alert">{error}</p>}<div className="modal-actions"><button className="btn secondary" disabled={busy} onClick={()=>{setError('');setStep('details')}}><ArrowLeft size={14}/> Back to edit</button><button className="btn primary" disabled={busy} onClick={confirm}>{busy?<><span className="spinner"/> Saving…</>:<>Confirm registration <Check size={15}/></>}</button></div></div>}
    {step==='success'&&saved&&<div className="registration-success"><div className="success-check"><CheckCircle2 size={37}/></div><p className="success-lead">Registration confirmed</p><h3>{saved.event.title}</h3><div className="success-details"><span><CalendarDays size={15}/>{new Date(`${saved.event.eventDate}T12:00:00`).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})} · {saved.event.eventTime}</span><span><MapPin size={15}/>{saved.event.venue}</span><span>Registered for <b>{saved.fullName}</b> · {saved.studentId}</span></div><div className="reference-box"><small>REGISTRATION REFERENCE</small><b>{saved.reference}</b></div><div className="success-actions"><button className="btn secondary" onClick={()=>{close();navigate('/events')}}>Explore events</button><button className="btn primary" onClick={()=>{close();navigate('/registrations')}}>My registrations <ArrowRight size={15}/></button></div></div>}
  </section></div>;
}
function Required(){return <em className="required-star" aria-label="required">*</em>}
function FormInput({label,field,value,set,error,placeholder,type='text',required=true}:{label:string;field:Field;value:string;set:(k:Field,v:string)=>void;error?:string;placeholder:string;type?:string;required?:boolean}){return <label>{label}{required&&<Required/>}<input type={type} value={value} onChange={e=>set(field,e.target.value)} placeholder={placeholder} aria-invalid={!!error} autoComplete={field==='fullName'?'name':field==='collegeEmail'?'email':'off'}/>{error&&<small className="field-error">{error}</small>}</label>}
