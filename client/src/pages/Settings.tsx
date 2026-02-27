import { AccountSettingsCards, ChangePasswordCard, DeleteAccountCard  } from "@daveyplate/better-auth-ui"
import { authClient } from '@/lib/auth-client';
import api from '@/configs/axios';
import { useEffect, useState } from 'react'
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export interface UserPlan {
  isPaid:      boolean;
  name:        string;
  price:       number;
}

const Settings = () => {

  const [userPlan, setUserPlan] = useState<UserPlan>();
  const {data: session, isPending} = authClient.useSession();
  const navigate = useNavigate();

  const fetchUserPlan = async () => {
          try {console.log(session?.user)
              const { data}  = await api.get('/api/user/plan');
              console.log('data', data);
              setUserPlan(data);
          } catch (error: any) {
              console.log(error);
              toast.error(error?.response?.data?.message || error.message)
          }
  }
  useEffect(()=>{
          if(session?.user && !isPending){
              fetchUserPlan();
          }else if(!isPending && !session?.user){
              navigate('/');
              toast('Please login to view your settings');
          }
      },[session?.user]);

  return (
 
    <div className="w-full p-4 flex justify-center items-center min-h-[90vh] flex-col gap-6 py-12">
      <AccountSettingsCards 
      classNames={{
        card: {
            base: 'bg-black/10 ring ring-indigo-950 max-w-xl mx-auto',
            footer: 'bg-black/10 ring ring-indigo-950'
        }
      }}/>
      <div className="w-full">
            <ChangePasswordCard classNames={{
                base: 'bg-black/10 ring ring-indigo-950 max-w-xl mx-auto',
                footer: 'bg-black/10 ring ring-indigo-950'
            }}/>
      </div>
      <div className="w-full">
        <div data-slot="card" className="text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm w-full pb-0 text-start bg-black/10 ring ring-indigo-950 max-w-xl mx-auto"><div data-slot="card-header" className="@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6">
            <div data-slot="card-title" className="font-semibold text-lg md:text-xl">Current Plan</div><div data-slot="card-description" className="text-muted-foreground text-xs md:text-sm">
              Your current Plan
            </div>
          </div>
          <div data-slot="card-content" className="px-6">
            <div data-slot="form-item" className="grid gap-2">
              {userPlan?.name} - ${userPlan?.price}/month
            </div>
          </div>
          <div data-slot="card-footer" className="items-center px-6 [.border-t]:pt-6 flex flex-col justify-between gap-4 rounded-b-xl md:flex-row !py-4 border-t bg-black/10 ring ring-indigo-950">
            <div data-slot="card-description" className="text-center text-muted-foreground text-xs md:text-start md:text-sm">
              
            </div>
            <button data-slot="button" className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&amp;_svg]:pointer-events-none [&amp;_svg:not([class*='size-'])]:size-4 shrink-0 [&amp;_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60 h-8 rounded-md gap-1.5 px-3 has-[&gt;svg]:px-2.5 md:ms-auto" type="button">Delete Plan</button>
          </div>
        </div>
      </div>
      <div className="w-full">
            <DeleteAccountCard classNames={{
                base: 'bg-black/10 ring ring-indigo-950 max-w-xl mx-auto'
            }}/>
        </div>
      </div>     
  )
}

export default Settings
