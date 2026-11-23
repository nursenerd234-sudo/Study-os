/* Study OS — plans and starter flashcards */
/* ================= PLANS ================= */
const NCLEX_P1=['Test plan, Clinical Judgment Model, NGN item types','Prioritization: ABCs, Maslow, acute vs chronic','Safety & infection prevention','Fundamentals of care','Pharmacology basics: suffixes, high-alert meds','Dosage calculation + antidotes','Lab values & vital signs','Delegation, assignment, legal/ethical','Pharm by class I: cardiac, anticoagulants, diuretics, insulin','Pharm by class II: psych, antibiotics, steroids, opioids, respiratory','Health promotion, growth & development, communication','Review + 75-question checkpoint'];
const NCLEX_P2=['Cardiovascular','Cardiovascular (ECG, shock)','Respiratory','Fluids, electrolytes, acid-base','Renal & urinary','Endocrine','Neuro','GI & liver','Hematology & oncology','Immune, infectious, musculoskeletal, skin','Maternity & newborn','Maternity & newborn (labor, postpartum)','Pediatrics','Pediatrics (peds dosing, congenital)','Mental health','Leadership, priorities, delegation','Buffer week + 100-question checkpoint'];
function weeksSince(iso){return Math.floor((Date.now()-new Date(iso+'T00:00:00').getTime())/(7*DAY))}
function nclexToday(){
  const d=today();
  if(d<'2027-01-03')return{phase:'Phase 0 · Setup',task:'10–15 practice questions + read the 2026 NCLEX-RN test plan',detail:'Build habits. Baseline test this month.'};
  if(d<'2027-04-04'){const w=Math.min(11,weeksSince('2027-01-03'));return{phase:'Phase 1 · Foundation · Week '+(w+1),task:'15–25 untimed questions + read rationales',detail:'Topic: '+NCLEX_P1[w]}}
  if(d<'2027-08-01'){const w=Math.min(16,weeksSince('2027-04-04'));return{phase:'Phase 2 · System review · Week '+(w+1),task:'30–50 questions on this system',detail:'System: '+NCLEX_P2[w]}}
  if(d<'2027-10-15')return{phase:'Phase 3 · Question bank',task:'75 timed mixed questions + full review',detail:'Readiness assessment every 2 weeks.'};
  return{phase:'Phase 4 · Final readiness',task:'75–100 questions on your weakest topics',detail:'Check your error log top 5.'};
}
const OPH=[
 ['Eye anatomy & how the eye works','Observe 10 slit-lamp exams; name each structure.'],
 ['Clinic basics: VA, pupils, IOP','Do visual acuities; assist IOP measurements.'],
 ['Imaging: OCT, fundus photos, visual fields','Assist imaging at the research center.'],
 ['Meds I: dilating drops, anesthetics, fluorescein','Learn where each drop is stored; check cap colors.'],
 ['Meds II: glaucoma, steroids, NSAIDs, antibiotics, anti-VEGF','Teach drop technique to a patient (supervised).'],
 ['Conditions I: cataract & glaucoma','Follow a cataract patient clinic → post-op day 1.'],
 ['Conditions II: retina (DR, AMD, RD, CRAO)','Assist injection lists; look at DME/AMD OCTs.'],
 ['Conditions III: cornea, uveitis, trauma, emergencies','Practice the eye irrigation set-up.'],
 ['OR I: sterile technique, microscope, cataract surgery','Scrub/observe cataract cases.'],
 ['OR II: vitrectomy, trabeculectomy, injections, lasers','Observe a vitrectomy and a laser session.'],
 ['Sterilization & infection prevention','Spend time with instrument reprocessing.'],
 ['Quality, safety, workflow & GCP research','Observe time-outs; learn research SOPs.']];
const HI=[
 ['What is health informatics? EHR, clinical data, workflows','Write 5 lines: where does data get created in your clinic?'],
 ['Health data standards: ICD-10, SNOMED CT, LOINC, RxNorm','Find the ICD-10 code for primary open-angle glaucoma.'],
 ['Interoperability: HL7 v2 and FHIR basics','Read the FHIR overview on hl7.org; name 5 FHIR resources.'],
 ['Privacy & security: HIPAA, consent, de-identification','List the identifiers you would remove from a dataset.'],
 ['Python basics I (Kaggle Learn: Python)','Finish 2 Kaggle Learn Python lessons.'],
 ['Python II: pandas (Kaggle Learn: Pandas)','Load a small CSV and count rows by category.'],
 ['Data visualization + basic statistics','Plot one chart from your CSV.'],
 ['Intro to machine learning (Kaggle Learn)','Finish the first Intro to ML lessons.'],
 ['Evaluating models: sensitivity, specificity, PPV, AUC, bias','Calculate sensitivity/specificity from a 2×2 table.'],
 ['AI in ophthalmology: diabetic retinopathy screening, OCT AI','Read one EyeWiki/review article on AI in DR screening.'],
 ['Clinical decision support, AI ethics, regulation (FDA SaMD)','Write 5 risks of using AI in an eye clinic.'],
 ['Mini project: one-page case study on AI in your clinic','Draft it in English; this goes in your CV/portfolio.']];
const ENG=[ /* by weekday 0=Sun */
 ['Listening 20 min','Nursing YouTube / podcast on your commute. Note 5 new words → Capture.'],
 ['Shadowing 15 min','Repeat a 1-minute clip sentence by sentence.'],
 ['Speaking: record a 2-min SBAR','Record yourself handing off a patient, listen back once.'],
 ['Read rationales out loud 15 min','Read today\'s NCLEX rationales aloud for pronunciation.'],
 ['Writing 20 min','One short paragraph (OET letter / IELTS task from June 2027).'],
 ['Reading 30 min','A long article or a mock reading test.'],
 ['Speaking session','Tutor or speaking partner (iTalki / Cambly / friend).']];
function wk(n){return Math.max(0,Math.min(n-1,weeksSince(S.settings.start)))}
function todayTasks(){
  const n=nclexToday(), o=OPH[wk(12)], h=HI[wk(12)], e=ENG[new Date().getDay()];
  return [
   {id:'cards',tr:'all',t:'Review your cards',d:'Start session above',auto:true},
   {id:'nclex',tr:'nclex',t:n.task,d:n.phase+' — '+n.detail},
   {id:'eng',tr:'eng',t:e[0],d:e[1]},
   {id:'oph',tr:'oph',t:'Ophthalmology: '+o[0],d:'Week '+(wk(12)+1)+' · At work: '+o[1]},
   {id:'hi',tr:'hi',t:'20 min: '+h[0],d:'Week '+(wk(12)+1)+' · '+h[1]}];
}

/* ================= SEED CARDS ================= */
const SEED={
oph:[
['Eye drop cap color RED means?','Mydriatic / cycloplegic (dilating): tropicamide, phenylephrine, cyclopentolate, atropine'],
['Cap color GREEN means?','Miotic (constricts pupil) — pilocarpine'],
['Cap color YELLOW or BLUE means?','Beta-blocker — timolol'],
['Cap color PURPLE means?','Alpha agonist — brimonidine'],
['Cap color ORANGE means?','Carbonic anhydrase inhibitor — dorzolamide'],
['Cap color TURQUOISE means?','Prostaglandin analog — latanoprost'],
['Cap colors PINK / GRAY / TAN mean?','Pink = steroid · Gray = NSAID · Tan = antibiotic'],
['Acute angle-closure: sudden severe pain, halos, nausea, hazy cornea and a [[mid-dilated, fixed]] pupil.',''],
['First action in a chemical eye injury?','Irrigate immediately (before visual acuity) until pH is neutral; sweep the fornices.'],
['Open globe injury — nursing actions?','Rigid shield with no pressure, no drops, no IOP check, NPO, antiemetic, tetanus status.'],
['Sudden painless severe vision loss in one eye + cherry-red spot?','Central retinal artery occlusion — an eye stroke. Emergency.'],
['3 symptoms of retinal detachment?','Flashes, new floaters, curtain/shadow over vision.'],
['RSVP warning signs after surgery or injection?','Redness, Sensitivity to light, Vision loss, Pain → endophthalmitis risk, come the same day.'],
['Gas bubble in the eye after vitrectomy: avoid?','Flying, high altitude and nitrous oxide anaesthesia until the gas is gone (gas expands → IOP rises).'],
['Latanoprost side effects to warn about?','Permanent iris darkening, longer lashes, red eye, periorbital fat loss.'],
['Timolol drops — ask about which conditions first?','Asthma/COPD, bradycardia, heart block, heart failure.'],
['Brimonidine is contraindicated in [[infants and young children]] (CNS depression, apnea).',''],
['Prednisolone acetate drops: key teaching?','Suspension → shake well; taper, never stop suddenly; can raise IOP.'],
['Why never send topical anesthetic drops home?','Repeated use damages the cornea.'],
['Punctal occlusion: how and why?','Press the inner corner of the eye 1–2 min after a drop → less systemic absorption.'],
['Wait [[5 minutes]] between two different eye drops.',''],
['What is TASS?','Toxic anterior segment syndrome: sterile inflammation 12–48 h after cataract surgery, usually from instrument residue.'],
['Spaulding class of a tonometer tip?','Semi-critical → at least high-level disinfection (or disposable tips).'],
['Atropine is contraindicated in [[angle-closure glaucoma]].',''],
['Hyphema nursing care?','Head elevated 30–45°, shield, avoid aspirin/NSAIDs, watch for rebleed and high IOP.'],
['Anti-VEGF injections treat?','Wet AMD, diabetic macular edema, retinal vein occlusion.'],
['Normal IOP range (approx.)?','About 10–21 mmHg.'],
['After IV fluorescein, warn the patient about?','Yellow skin for hours and orange urine for up to ~48 h; nausea possible.'],
['Time-out in cataract surgery must confirm?','Patient, procedure, operative eye, IOL model and power (read aloud).']],
nclex:[
['Sodium normal range?','135–145 mEq/L (ranges vary slightly by book — match yours)'],
['Potassium normal range?','3.5–5.0 mEq/L'],
['Magnesium normal range?','About 1.3–2.1 mEq/L (check your book)'],
['ABG normals: pH / PaCO2 / HCO3?','pH 7.35–7.45 · PaCO2 35–45 mmHg · HCO3 22–26 mEq/L'],
['Platelets normal?','150,000–400,000 /mm³'],
['WBC normal?','5,000–10,000 /mm³'],
['Therapeutic INR on warfarin (most indications)?','2–3'],
['Therapeutic digoxin level?','0.5–2.0 ng/mL (check toxicity signs: nausea, vision changes, bradycardia)'],
['Therapeutic lithium level (maintenance)?','About 0.6–1.2 mEq/L'],
['Antidote: heparin','Protamine sulfate'],
['Antidote: warfarin','Vitamin K'],
['Antidote: opioids','Naloxone'],
['Antidote: benzodiazepines','Flumazenil'],
['Antidote: acetaminophen','Acetylcysteine'],
['Antidote: magnesium sulfate toxicity','Calcium gluconate'],
['Antidote: digoxin toxicity','Digoxin immune fab'],
['The 6 steps of the NCSBN Clinical Judgment Model?','Recognize cues → Analyze cues → Prioritize hypotheses → Generate solutions → Take action → Evaluate outcomes'],
['Airborne precautions: diseases + PPE?','TB, measles, varicella → N95 respirator, negative-pressure room'],
['Droplet precautions: diseases + PPE?','Influenza, pertussis, meningococcal meningitis → surgical mask within close range'],
['Contact precautions + C. difficile hand hygiene?','Gown + gloves; for C. diff wash with soap and water (alcohol gel does not kill spores)'],
['PPE donning order?','Gown → mask/respirator → goggles/face shield → gloves'],
['PPE doffing order (CDC example)?','Gloves → goggles/face shield → gown → mask/respirator (then hand hygiene)'],
['What can NOT be delegated to UAP?','Assessment, teaching, evaluation, care of unstable clients (the nursing process).'],
['Prioritization frameworks in order of use?','ABCs → Maslow → acute over chronic → actual over potential → unstable over stable'],
['Drug suffix -olol?','Beta-blocker (e.g., metoprolol)'],
['Drug suffix -pril?','ACE inhibitor (e.g., lisinopril) — watch dry cough, angioedema, high K'],
['Drug suffix -sartan?','ARB (e.g., losartan)'],
['Drug suffix -statin?','HMG-CoA reductase inhibitor — watch muscle pain, liver enzymes'],
['Drug suffix -azole (e.g., omeprazole)?','Proton pump inhibitor (-prazole); other -azoles are antifungals'],
['Hypokalemia ECG sign?','U waves, flat T waves']],
eng:[
['instill (verb)','To put drops into something. "Instill one drop in the right eye twice a day."'],
['photophobia','Sensitivity to light. "The patient reports photophobia since yesterday."'],
['adherence','Following the treatment plan. "Adherence to glaucoma drops is poor."'],
['taper (verb)','To reduce a dose slowly. "We will taper the steroid drops over four weeks."'],
['contraindicated','Should not be used. "Timolol is contraindicated in severe asthma."'],
['escalate (verb)','To report up to a senior. "I escalated the high IOP to the doctor."'],
['deteriorate (verb)','To get worse. "His vision deteriorated overnight."'],
['reassure (verb)','To make someone less worried. "I reassured her that the floaters are expected."'],
['SBAR','Situation, Background, Assessment, Recommendation — a structured handoff.'],
['"Can you rate your pain from 0 to 10?"','Standard pain assessment question.'],
['"You may feel a slight touch on your eye."','Phrase used before tonometry.'],
['"Please keep looking at the light."','Phrase used during eye exams and imaging.'],
['informed consent','Agreement after understanding risks, benefits and alternatives.'],
['adverse event','Any harmful or unwanted event during treatment or a study.'],
['concise','Short and clear. "Keep your handoff concise."'],
['subsequently','After that. "Subsequently, the pressure decreased."'],
['adequate','Enough. "Is the pain control adequate?"'],
['blurred vision','Vision that is not sharp. "Blurred vision is normal for a few hours after dilation."'],
['to be discharged','To leave the hospital or clinic officially. "She will be discharged after the check."'],
['follow-up appointment','The next scheduled visit. "Your follow-up appointment is tomorrow at 9."']],
hi:[
['EHR vs EMR?','EMR = digital chart inside one practice. EHR = shareable record across organizations.'],
['What is HL7 FHIR?','A standard for exchanging health data through web APIs, built from "resources" (Patient, Observation, Condition…).'],
['ICD-10 is used for?','Coding diagnoses (and billing/statistics).'],
['SNOMED CT is used for?','Detailed clinical terminology inside records (findings, procedures, diagnoses).'],
['LOINC is used for?','Identifying lab tests and clinical observations.'],
['RxNorm is used for?','Standard names/codes for medications (US).'],
['Interoperability means?','Different systems can exchange data AND use it correctly.'],
['HIPAA protects?','Privacy and security of protected health information (PHI) in the US.'],
['De-identification?','Removing identifiers (name, dates, IDs…) so data cannot be linked to a person.'],
['Clinical decision support (CDS)?','Tools that give clinicians patient-specific advice at the right time (alerts, order sets, AI predictions).'],
['Sensitivity?','True positives ÷ all who have the disease — "how many sick people the test catches".'],
['Specificity?','True negatives ÷ all who do not have the disease — "how many healthy people it correctly clears".'],
['PPV (positive predictive value)?','True positives ÷ all positive results; depends on disease prevalence.'],
['AUC (ROC curve)?','How well a model separates classes across all thresholds; 0.5 = chance, 1.0 = perfect.'],
['Overfitting?','Model learns the training data too well (noise included) and performs worse on new data.'],
['Train / validation / test sets?','Train = learn, validation = tune, test = final unbiased check (never used during training).'],
['Supervised vs unsupervised learning?','Supervised uses labelled examples; unsupervised finds patterns without labels.'],
['Algorithmic bias in healthcare AI?','The model works worse for some groups because of unrepresentative data or design.'],
['First FDA-authorized autonomous AI diagnostic system (2018)?','IDx-DR (now LumineticsCore) — diabetic retinopathy screening from retinal photos.'],
['SaMD?','Software as a Medical Device — software (incl. AI) intended for medical purposes, regulated as a device.']]};
