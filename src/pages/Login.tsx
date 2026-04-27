import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Mail, 
  Lock, 
  Chrome, 
  ArrowRight, 
  User, 
  HandHelping, 
  LayoutDashboard, 
  CheckCircle2,
  ShieldAlert,
  ChevronRight,
} from "lucide-react";
import { auth, db, googleProvider } from "@/lib/firebase";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup,
  onAuthStateChanged,
  User as FirebaseUser
} from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

type Step = 'AUTH' | 'ROLE_SELECT' | 'ONBOARDING' | 'SUCCESS';
type Role = 'user' | 'volunteer' | 'admin';

export default function Login() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('AUTH');
  const [role, setRole] = useState<Role | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(true);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(25);
  const [authUser, setAuthUser] = useState<FirebaseUser | null>(null);

  // Onboarding fields
  const [fullName, setFullName] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [medicalInfo, setMedicalInfo] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [organization, setOrganization] = useState("");
  const [adminRole, setAdminRole] = useState("");
  const [location, setLocation] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("Auth State Changed. User:", user?.uid);
      if (user) {
        setAuthUser(user);
        try {
          const docRef = doc(db, "profiles", user.uid);
          const docSnap = await getDoc(docRef);
          console.log("Profile Doc Exists:", docSnap.exists());
          
          if (docSnap.exists()) {
            const profile = docSnap.data();
            if (profile.onboarded) {
              redirectBasedOnRole(profile.role);
            } else if (profile.role) {
              setRole(profile.role as Role);
              setStep('ONBOARDING');
              setProgress(75);
            } else {
              setStep('ROLE_SELECT');
              setProgress(50);
            }
          } else {
            console.log("No profile found, moving to role selection");
            setStep('ROLE_SELECT');
            setProgress(50);
          }
        } catch (err: any) {
          console.error("Error fetching profile:", err);
          toast.error(`Firestore Error: ${err.message}`);
          // If we can't get the doc, we might still want to try to let them select a role
          setStep('ROLE_SELECT');
          setProgress(50);
        }
      } else {
        setAuthUser(null);
        setStep('AUTH');
        setProgress(25);
      }
    });
    return () => unsubscribe();
  }, []);

  const redirectBasedOnRole = (userRole: string) => {
    switch (userRole) {
      case 'admin': window.location.href = '/admin'; break;
      case 'volunteer': window.location.href = '/volunteer'; break;
      case 'user': window.location.href = '/user'; break;
      default: window.location.href = '/';
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignUp) {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        toast.success("Account created successfully!");
        // Profile will be created in ROLE_SELECT or ONBOARDING
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        toast.success("Signed in successfully!");
      }
    } catch (error: any) {
      console.error("Auth Error Object:", error);
      if (error.code === 'auth/invalid-credential') {
        toast.error("Invalid email or password. If you just created this account, ensure you are in 'Sign In' mode.");
      } else {
        toast.error(`Auth Error (${error.code || 'unknown'}): ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!email) {
      toast.error("Please enter your email address first.");
      return;
    }
    setLoading(true);
    try {
      const { sendPasswordResetEmail } = await import("firebase/auth");
      await sendPasswordResetEmail(auth, email);
      toast.success("Password reset email sent!");
    } catch (error: any) {
      toast.error(`Reset Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      toast.success("Signed in with Google!");
    } catch (error: any) {
      toast.error(`Google Auth Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const selectRole = async (selectedRole: Role) => {
    if (!authUser) return;
    setRole(selectedRole);
    setLoading(true);
    try {
      await setDoc(doc(db, "profiles", authUser.uid), {
        uid: authUser.uid,
        email: authUser.email,
        role: selectedRole,
        onboarded: false,
        createdAt: new Date().toISOString()
      }, { merge: true });
      
      setStep('ONBOARDING');
      setProgress(75);
    } catch (error: any) {
      toast.error(`Role Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const submitOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser || !role) return;
    setLoading(true);
    try {
      const metadata: any = {};
      if (role === 'user') {
        metadata.emergency_contact = emergencyContact;
        metadata.medical_info = medicalInfo;
      } else if (role === 'volunteer') {
        metadata.skills = skills;
      } else if (role === 'admin') {
        metadata.organization = organization;
        metadata.role = adminRole;
        metadata.location = location;
      }

      await updateDoc(doc(db, "profiles", authUser.uid), {
        full_name: fullName,
        onboarded: true,
        metadata
      });

      setStep('SUCCESS');
      setProgress(100);
    } catch (error: any) {
      toast.error(`Onboarding Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 'AUTH':
        return (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-md space-y-8"
          >
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4 shadow-inner">
                <ShieldAlert className="h-8 w-8 text-primary animate-pulse" />
              </div>
              <h1 className="text-3xl font-black tracking-tight text-white">Responda</h1>
              <p className="mt-2 text-muted-foreground">Firebase-Powered Crisis Network</p>
            </div>

            <Card className="border-white/5 bg-black/40 p-6 backdrop-blur-xl shadow-2xl">
              <form onSubmit={handleAuth} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="name@example.com" 
                      className="pl-10 bg-white/5 border-white/10"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="password" 
                      type="password" 
                      placeholder="••••••••" 
                      className="pl-10 bg-white/5 border-white/10"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full h-12 text-base font-bold shadow-lg shadow-primary/20" disabled={loading}>
                  {loading ? "Processing..." : isSignUp ? "Create Account" : "Sign In"}
                </Button>
              </form>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-transparent px-2 text-muted-foreground">Or continue with</span>
                </div>
              </div>

              <Button variant="outline" className="w-full border-white/10 bg-white/5 hover:bg-white/10" onClick={handleGoogleAuth} disabled={loading}>
                <Chrome className="mr-2 h-4 w-4" />
                Google
              </Button>

              {!isSignUp && (
                <div className="mt-4 text-center">
                  <button 
                    onClick={handlePasswordReset}
                    className="text-xs text-muted-foreground hover:text-primary transition-colors"
                  >
                    Forgot your password?
                  </button>
                </div>
              )}

              <div className="mt-6 text-center text-sm">
                <span className="text-muted-foreground">
                  {isSignUp ? "Already have an account?" : "New here?"}
                </span>{" "}
                <button 
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="font-bold text-primary hover:underline"
                >
                  {isSignUp ? "Sign In" : "Sign up"}
                </button>
              </div>
            </Card>
          </motion.div>
        );

      case 'ROLE_SELECT':
        return (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="w-full max-w-4xl space-y-8"
          >
            <div className="text-center">
              <h2 className="text-3xl font-black text-white">How will you use Responda?</h2>
              <p className="mt-2 text-muted-foreground">Select your primary role to customize your experience.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <RoleCard 
                icon={<ShieldAlert className="h-10 w-10 text-red-500" />}
                title="USER IN NEED"
                description="I want to request help in emergencies"
                onClick={() => selectRole('user')}
                color="border-red-500/20 hover:border-red-500/50"
                bg="bg-red-500/5"
              />
              <RoleCard 
                icon={<HandHelping className="h-10 w-10 text-green-500" />}
                title="VOLUNTEER"
                description="I want to respond and help others"
                onClick={() => selectRole('volunteer')}
                color="border-green-500/20 hover:border-green-500/50"
                bg="bg-green-500/5"
              />
              <RoleCard 
                icon={<LayoutDashboard className="h-10 w-10 text-blue-500" />}
                title="ADMIN"
                description="I manage operations and coordination"
                onClick={() => selectRole('admin')}
                color="border-blue-500/20 hover:border-blue-500/50"
                bg="bg-blue-500/5"
              />
            </div>
          </motion.div>
        );

      case 'ONBOARDING':
        return (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="w-full max-w-lg space-y-8"
          >
            <div className="text-center">
              <Badge variant="outline" className="mb-4 border-primary/20 text-primary capitalize">
                {role} Profile Setup
              </Badge>
              <h2 className="text-3xl font-black text-white">Tell us about yourself</h2>
              <p className="mt-2 text-muted-foreground">Quick setup to get you started.</p>
            </div>

            <Card className="border-white/5 bg-black/40 p-6 backdrop-blur-xl shadow-2xl">
              <form onSubmit={submitOnboarding} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input 
                    id="fullName" 
                    placeholder="John Doe" 
                    className="bg-white/5 border-white/10 h-12"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>

                {role === 'user' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="emergencyContact">Emergency Contact (Phone)</Label>
                      <Input 
                        id="emergencyContact" 
                        placeholder="+1 (555) 000-0000" 
                        className="bg-white/5 border-white/10 h-12"
                        value={emergencyContact}
                        onChange={(e) => setEmergencyContact(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="medicalInfo">Medical Info (Allergies, etc.)</Label>
                      <Input 
                        id="medicalInfo" 
                        placeholder="N/A or Penicillin allergy" 
                        className="bg-white/5 border-white/10 h-12"
                        value={medicalInfo}
                        onChange={(e) => setMedicalInfo(e.target.value)}
                      />
                    </div>
                  </>
                )}

                {role === 'volunteer' && (
                  <div className="space-y-4">
                    <Label>Skills (Select all that apply)</Label>
                    <div className="flex flex-wrap gap-2">
                      {['Medical', 'Security', 'Logistics', 'First Aid', 'Search & Rescue'].map(skill => (
                        <button
                          key={skill}
                          type="button"
                          onClick={() => {
                            setSkills(prev => prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill])
                          }}
                          className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${
                            skills.includes(skill) 
                              ? "bg-primary border-primary text-white" 
                              : "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10"
                          }`}
                        >
                          {skill}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {role === 'admin' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="org">Organization Name</Label>
                      <Input 
                        id="org" 
                        placeholder="Red Cross, local Fire Dept, etc." 
                        className="bg-white/5 border-white/10 h-12"
                        value={organization}
                        onChange={(e) => setOrganization(e.target.value)}
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="adminRole">Your Role</Label>
                        <Input 
                          id="adminRole" 
                          placeholder="Coordinator" 
                          className="bg-white/5 border-white/10 h-12"
                          value={adminRole}
                          onChange={(e) => setAdminRole(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="location">Location</Label>
                        <Input 
                          id="location" 
                          placeholder="City, State" 
                          className="bg-white/5 border-white/10 h-12"
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                        />
                      </div>
                    </div>
                  </>
                )}

                <Button type="submit" className="w-full h-12 text-base font-bold" disabled={loading}>
                  {loading ? "Saving..." : "Complete Setup"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </form>
            </Card>
          </motion.div>
        );

      case 'SUCCESS':
        return (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-6"
          >
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-green-500/20 text-green-500 shadow-[0_0_50px_rgba(34,197,94,0.3)]">
              <CheckCircle2 className="h-12 w-12" />
            </div>
            <div className="space-y-2">
              <h2 className="text-4xl font-black text-white">Setup Complete</h2>
              <p className="text-muted-foreground">Welcome to the Responda network.</p>
            </div>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ duration: 2, ease: "easeInOut" }}
              onAnimationComplete={() => redirectBasedOnRole(role!)}
              className="h-1 bg-primary rounded-full max-w-[200px] mx-auto"
            />
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground animate-pulse">
              Redirecting to your dashboard...
            </p>
          </motion.div>
        );
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050505] p-6">
      {/* Dynamic Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-[20%] right-[10%] w-[20%] h-[20%] bg-green-500/5 blur-[80px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <AnimatePresence mode="wait">
        {renderStep()}
      </AnimatePresence>

      <div className="fixed bottom-8 left-0 right-0 text-center">
         <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest opacity-40">
           Secured by Firebase Cloud Protocol
         </p>
      </div>
    </div>
  );
}

function RoleCard({ icon, title, description, onClick, color, bg }: any) {
  return (
    <motion.div
      whileHover={{ y: -5, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`relative group cursor-pointer overflow-hidden rounded-2xl border ${color} ${bg} p-8 transition-all backdrop-blur-sm`}
    >
      <div className="mb-6 flex justify-center transition-transform group-hover:scale-110 duration-500">
        {icon}
      </div>
      <h3 className="text-center text-sm font-black tracking-widest text-white">{title}</h3>
      <p className="mt-2 text-center text-xs text-muted-foreground line-clamp-2">{description}</p>
      <div className="mt-6 flex justify-center">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 border border-white/10 group-hover:bg-primary group-hover:border-primary group-hover:text-white transition-all">
          <ChevronRight className="h-4 w-4" />
        </div>
      </div>
    </motion.div>
  );
}
