import React, { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { Project } from '../types'
import { ArrowBigDownDashIcon, EyeIcon, EyeOffIcon, FullscreenIcon, LaptopIcon, Loader2Icon, MessageSquareIcon, SaveIcon, SmartphoneIcon, TabletIcon, XIcon } from 'lucide-react'
import Sidebar from '../components/Sidebar'
import ProjectPreview, { type ProjectPreviewRef } from '../components/ProjectPreview'
import api from '@/configs/axios'
import { toast } from 'sonner'
import { authClient } from '@/lib/auth-client'


const Projects = () => {
  const {projectId} = useParams();
  const navigate = useNavigate();
  const {data: session, isPending} = authClient.useSession();

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [customDomain, setCustomDomain] = useState<string | null>(null);

  const [isGenerating, setIsGenerating] = useState(true);
  const [device, setDevice] = useState<'phone' | 'tablet' | 'desktop'>("desktop");

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const previewRef = useRef<ProjectPreviewRef>(null);

  const fetchProject = async () => {
    try {
      const { data } = await api.get(`/api/user/project/${projectId}`);
      setProject(data.project);
      setCustomDomain(data.project.custom_domain || null);
      setIsGenerating(data.project.current_code ? false : true)
      setLoading(false)
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error.message);
      console.log(error);
    }
  }

  const saveProject = async () => {
    if(!previewRef.current) return;
    const code = previewRef.current.getCode();
    if(!code) return;
    setIsSaving(true);
    try {
      const { data } = await api.put(`/api/project/save/${projectId}`, {'code': code, 'custom_domain': customDomain});
      toast.success(data.message)
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error.message);
      console.log(error);
    }finally{
      setIsSaving(false);
    }
    };

    // download code ( index.html )
  const downloadCode = ()=>{
    const code = previewRef.current?.getCode() || project?.current_code;
    if(!code){
      if(isGenerating){
        return
      }
      return
    }
    const element = document.createElement('a');
    const file = new Blob([code], {type: "text/html"});
    element.href = URL.createObjectURL(file)
    element.download = "index.html";
    document.body.appendChild(element)
    element.click();
  }

  const togglePublish = async () => {
    try {
      const { data } = await api.get(`/api/user/publish-toggle/${projectId}`);
      toast.success(data.message)
      setProject((prev)=> prev ? ({...prev, isPublished: !prev.isPublished}) : null);

      let result: any;
      if(!project?.isPublished){
        result = await api.post('/api/deploy/add', {'projectId': projectId});
      } else {
        result = await api.delete('/api/deploy/delete', {data: {'projectId': projectId}});
      }
      console.log(result);
      setTimeout(() => toast.success(result.data.message), 2000);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error.message);
      console.log(error);
    }
  }

  useEffect(()=>{
    if(session?.user){
      fetchProject();
    }else if(!isPending && !session?.user){
      navigate("/")
      toast("Please login to view your projects")
    }
  },[session?.user])

  useEffect(()=>{
    if(project && !project.current_code){
      const intervalId = setInterval(fetchProject, 10000);
      return ()=> clearInterval(intervalId)
    }
  },[project])

  if(loading){
    return (
      <>
      <div className="flex items-center justify-center h-screen">
        <Loader2Icon className="size-7 animate-spin text-violet-200"/>
      </div>
      </>
    )
  }
  return project ? (
    <div className='flex flex-col h-screen w-full bg-gray-900 text-white'>
      {/* builder navbar  */}
      <div className='flex max-sm:flex-col sm:items-center gap-4 px-4 py-2 no-scrollbar'>
        {/* left  */}
        <div className='flex items-center gap-2 sm:min-w-90 text-nowrap'>
          <img src="/favicon.svg" alt="logo" className="h-6 cursor-pointer" onClick={()=> navigate('/')}/>
          <div className='max-w-64 sm:max-w-xs'>
            <p className='text-sm text-medium capitalize truncate'>{project.name}</p>
            <p className='text-xs text-gray-400 -mt-0.5'>Previewing last saved version</p>
          </div>
          <div className='sm:hidden flex-1 flex justify-end'>
            {isMenuOpen ? 
            <MessageSquareIcon onClick={()=> setIsMenuOpen(false)} className="size-6 cursor-pointer" />
            : <XIcon onClick={()=> setIsMenuOpen(true)} className="size-6 cursor-pointer"/>}
          </div>
        </div>
        {/* middle  */}
        <div className='hidden sm:flex gap-2 bg-gray-950 p-1.5 rounded-md'>
          <SmartphoneIcon onClick={()=> setDevice('phone')} className={`size-6 p-1 rounded cursor-pointer ${device === 'phone' ? "bg-gray-700" : ""}`}/>

          <TabletIcon onClick={()=> setDevice('tablet')} className={`size-6 p-1 rounded cursor-pointer ${device === 'tablet' ? "bg-gray-700" : ""}`}/>

          <LaptopIcon onClick={()=> setDevice('desktop')} className={`size-6 p-1 rounded cursor-pointer ${device === 'desktop' ? "bg-gray-700" : ""}`}/>
        </div>
        {/* right  */}
        <div className='flex flex-col gap-3 flex-1 text-xs sm:text-sm lg:flex-row lg:items-center lg:justify-end'>
          {/* Custom Domain Section - Full width on mobile, auto on desktop */}
          <div className='flex flex-col sm:flex-row sm:items-center gap-2 w-full lg:w-auto'>
            <label htmlFor="customDomain" className='text-gray-400 whitespace-nowrap hidden sm:block'>
              Custom Domain:
            </label>
            <input 
              id="customDomain" 
              placeholder='e.g. yourdomain.com' 
              value={customDomain || ""} 
              onChange={(e) => setCustomDomain(e.target.value)} 
              className='bg-gray-800 text-white px-3 py-2 rounded-md border border-gray-700 focus:ring-2 focus:ring-gray-500 focus:outline-none transition-colors w-full sm:flex-1 lg:w-64 xl:w-80'
            />
          </div>

          {/* Action Buttons Section - Stacked on mobile, horizontal on tablet+ */}
          <div className='flex flex-col sm:flex-row gap-2 sm:gap-1.5'>
            {/* Save Button - Hidden on mobile, shown on small screens+ */}
            <button 
              onClick={saveProject} 
              disabled={isSaving} 
              className='hidden sm:flex bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-3.5 py-2 items-center justify-center gap-2 rounded transition-colors border border-gray-700 whitespace-nowrap'
              aria-label="Save project"
            >
              {isSaving ? <Loader2Icon className="animate-spin" size={16}/> : <SaveIcon size={16}/>} 
              Save
            </button>

            {/* Preview Button */}
            <Link 
              target='_blank' 
              to={`/preview/${projectId}`} 
              className="flex items-center justify-center gap-2 px-4 py-2 rounded border border-gray-700 hover:border-gray-500 hover:bg-gray-800/50 transition-colors whitespace-nowrap"
              aria-label="Preview project"
            >
              <FullscreenIcon size={16} /> 
              Preview
            </Link>

            {/* Download Button */}
            <button 
              onClick={downloadCode} 
              className='bg-gradient-to-br from-blue-700 to-blue-600 hover:from-blue-600 hover:to-blue-500 text-white px-3.5 py-2 flex items-center justify-center gap-2 rounded transition-colors shadow-sm hover:shadow-md whitespace-nowrap'
              aria-label="Download code"
            >
              <ArrowBigDownDashIcon size={16} /> 
              Download
            </button>

            {/* Publish/Unpublish Button */}
            <button 
              onClick={togglePublish} 
              className='bg-gradient-to-br from-indigo-700 to-indigo-600 hover:from-indigo-600 hover:to-indigo-500 text-white px-3.5 py-2 flex items-center justify-center gap-2 rounded transition-colors shadow-sm hover:shadow-md whitespace-nowrap'
              aria-label={project.isPublished ? "Unpublish project" : "Publish project"}
            >
              {project.isPublished ? <EyeOffIcon size={16}/> : <EyeIcon size={16}/>}
              {project.isPublished ? "Unpublish" : "Publish"}
            </button>
          </div>
        </div>
      </div>
      <div className='flex-1 flex overflow-auto'>
             <Sidebar isMenuOpen={isMenuOpen} project={project} setProject={(p)=>setProject(p)} isGenerating={isGenerating} setIsGenerating={setIsGenerating}/>

              <div className='flex-1 p-2 pl-0'>
                <ProjectPreview ref={previewRef} project={project} isGenerating={isGenerating} device={device}/>
              </div>
      </div>
    </div>
  )
  : 
  (
    <div className='flex items-center justify-center h-screen'>
      <p className="text-2xl font-medium text-gray-200">Unable to load project!</p>
    </div>
  )
}

export default Projects
