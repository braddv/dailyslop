const NS = "http://www.w3.org/2000/svg";

const chapters = [
  {
    number: "01", short: "The SFC method", title: "A map with no black holes",
    label: "Chapter 01 · Introduction", meta: "6 nodes · 8 connections",
    summary: "Godley and Lavoie begin with a discipline, not a forecast: connect flows to stocks, keep every sector's books complete, then add behavioral equations to make the accounting move through time.",
    lab: "This chapter establishes the model-building sequence. Select a node to see why accounting comes before behavioral assumptions.",
    nodes: [
      { id:"opening", symbol:"S₋₁", label:"Opening stocks", type:"stock", x:95, y:210, description:"The inherited balance sheets at the start of a period: the compact record of everything that happened before.", equation:"Sₜ₋₁ = closing stocks from t−1" },
      { id:"behavior", symbol:"ƒ", label:"Behavior", type:"external", x:285, y:90, description:"Rules for consumption, portfolio choice and other decisions provide the model's causal closure.", equation:"decisionsₜ = ƒ(incomeₜ, wealthₜ₋₁, parameters)" },
      { id:"flows", symbol:"Fₜ", label:"Transaction flows", type:"flow", x:465, y:210, description:"Payments during the period—wages, consumption, taxes, interest and asset purchases—link every sector.", equation:"Σ sector inflowsₜ − Σ outflowsₜ = savingₜ" },
      { id:"matrix", symbol:"Σ=0", label:"Accounting matrix", type:"actor", x:650, y:90, description:"Each transaction appears twice with opposite signs. Every row and every sector column must sum to zero.", equation:"∀ rows, columns: Σ entries = 0" },
      { id:"closing", symbol:"Sₜ", label:"Closing stocks", type:"stock", x:820, y:210, description:"Flows update the opening balance sheet. Revaluation and capital gains may also change the closing stock.", equation:"Sₜ = Sₜ₋₁ + ΔSₜ + capital gainsₜ" },
      { id:"closure", symbol:"✓", label:"Hidden equation", type:"external", x:465, y:400, description:"One equation is implied by the others. Leaving it out of the solver and checking it afterward tests whether the system is watertight.", equation:"residual identity = 0 (verification only)" }
    ],
    edges: [
      ["opening","behavior","conditions"], ["behavior","flows","decisions"], ["opening","flows","availability"], ["flows","matrix","record"],
      ["matrix","closing","reconcile"], ["flows","closing","accumulate"], ["matrix","closure","implies","identity"], ["closure","closing","checks","identity"]
    ]
  },
  {
    number:"02", short:"The monetary circuit", title:"Every payment has a counterparty",
    label:"Chapter 02 · Balance sheets, transactions + the monetary circuit", meta:"5 sectors · 9 transactions",
    summary:"The transactions-flow matrix becomes a network. Households, firms, banks, government and the central bank exchange income and financial claims; each arrow creates an equal and opposite entry.",
    lab:"Chapter 2 is an accounting circuit rather than a closed behavioral model. Trace a sector to isolate both sides of its transactions.",
    nodes: [
      { id:"households", symbol:"HH", label:"Households", type:"actor", x:120, y:250, description:"Households receive wages and distributed profits, consume, pay taxes, and allocate saving across money and securities.", equation:"ΔNWₕ = income − consumption − taxes + gains" },
      { id:"firms", symbol:"F", label:"Production firms", type:"actor", x:360, y:100, description:"Firms produce goods, pay wages, receive consumption and government spending, invest and borrow.", equation:"sales + Δloans + equity issues = wages + investment + distributions" },
      { id:"banks", symbol:"B", label:"Banks", type:"actor", x:360, y:400, description:"Banks create deposits and loans as matching balance-sheet entries and hold government bills or cash to close their position.", equation:"loans + cash + bills = deposits + bank net worth" },
      { id:"government", symbol:"G", label:"Government", type:"actor", x:650, y:100, description:"Government purchases goods and services, collects taxes and issues cash or securities to finance a deficit.", equation:"deficit = G − T = Δcash + Δbills" },
      { id:"centralbank", symbol:"CB", label:"Central bank", type:"actor", x:760, y:400, description:"The central bank supplies state money and can hold government bills, completing the hierarchy of financial claims.", equation:"assets (bills) = liabilities (state money) + net worth" }
    ],
    edges: [
      ["firms","households","wages"], ["households","firms","consumption"], ["government","firms","spending"], ["households","government","taxes"],
      ["banks","firms","loans"], ["firms","households","profits"], ["banks","households","deposits"], ["government","banks","bills"], ["centralbank","banks","reserves"]
    ]
  },
  {
    number:"03", short:"Model SIM", title:"The simplest economy that remembers",
    label:"Chapter 03 · The simplest model with government money", meta:"8 variables · Model SIM",
    summary:"SIM compresses the economy to households, firms and government. Government spending creates income; taxes withdraw it; saving accumulates as money and feeds next period's consumption.",
    lab:"Move the fiscal and household parameters. The chart resolves the circular income–consumption loop in each period, then carries money forward as a stock.",
    model:"SIM",
    nodes: [
      { id:"G", symbol:"G", label:"Govt spending", type:"external", x:95, y:120, description:"Government demand is fixed outside the model and directly adds to output.", equation:"G = exogenous" },
      { id:"Y", symbol:"Y", label:"National income", type:"flow", x:300, y:120, description:"With no investment, output equals household consumption plus government spending.", equation:"Y = C + G" },
      { id:"T", symbol:"T", label:"Taxes", type:"flow", x:510, y:80, description:"A proportional tax on income is the government's current receipt.", equation:"T = θY" },
      { id:"YD", symbol:"YD", label:"Disposable income", type:"flow", x:690, y:170, description:"Income available to households after tax payments.", equation:"YD = Y − T" },
      { id:"C", symbol:"C", label:"Consumption", type:"flow", x:500, y:360, description:"Households consume from current disposable income and from money inherited from the prior period.", equation:"C = α₁YD + α₂H₋₁" },
      { id:"Hlag", symbol:"H₋₁", label:"Opening money", type:"stock", x:250, y:400, description:"Last period's closing money stock enters the current consumption decision.", equation:"H₋₁ = H from the previous period" },
      { id:"dH", symbol:"ΔH", label:"Household saving", type:"flow", x:820, y:360, description:"Disposable income not consumed is saved as government money.", equation:"ΔH = YD − C" },
      { id:"H", symbol:"H", label:"Closing money", type:"stock", x:690, y:480, description:"The closing stock of household money is also the government's outstanding money liability.", equation:"H = H₋₁ + ΔH" }
    ],
    edges: [
      ["G","Y","demand"], ["C","Y","demand"], ["Y","T","tax base"], ["Y","YD","income"], ["T","YD","subtract"],
      ["YD","C","propensity"], ["Hlag","C","wealth effect"], ["YD","dH","income"], ["C","dH","subtract"], ["dH","H","accumulate"], ["Hlag","H","carry"], ["H","Hlag","next period","identity"]
    ],
    controls: [
      { id:"G", label:"Government spending · G", min:10, max:40, step:1, value:20 },
      { id:"theta", label:"Tax rate · θ", min:.1, max:.4, step:.01, value:.2 },
      { id:"alpha1", label:"Income propensity · α₁", min:.4, max:.85, step:.01, value:.6 },
      { id:"alpha2", label:"Wealth propensity · α₂", min:.1, max:.6, step:.01, value:.4 }
    ]
  },
  {
    number:"04", short:"Model PC", title:"Money meets portfolio choice",
    label:"Chapter 04 · Government money with portfolio choice", meta:"11 variables · Model PC",
    summary:"PC adds interest-bearing Treasury bills. Household saving now becomes wealth that must be allocated between liquid money and bills, linking fiscal policy, interest income and portfolio preferences.",
    lab:"Change the bill rate or portfolio preference. Higher interest income lifts disposable income while the desired asset mix reallocates wealth between money and bills.",
    model:"PC",
    nodes: [
      { id:"G", symbol:"G", label:"Govt spending", type:"external", x:75, y:90, description:"Government purchases are an exogenous source of aggregate demand.", equation:"G = exogenous" },
      { id:"r", symbol:"r", label:"Bill rate", type:"external", x:75, y:330, description:"The interest rate paid on Treasury bills is set outside the basic PC model.", equation:"r = exogenous" },
      { id:"Blag", symbol:"Bh₋₁", label:"Opening bills", type:"stock", x:235, y:430, description:"Bills carried from last period generate interest income in the current period.", equation:"interest income = r₋₁Bh₋₁" },
      { id:"Y", symbol:"Y", label:"National income", type:"flow", x:280, y:90, description:"Output is determined by household consumption and government demand.", equation:"Y = C + G" },
      { id:"TX", symbol:"TX", label:"Taxes", type:"flow", x:455, y:70, description:"Taxes apply to production income plus interest received on bills.", equation:"TX = θ(Y + r₋₁Bh₋₁)" },
      { id:"YD", symbol:"YD", label:"Disposable income", type:"flow", x:625, y:145, description:"Household disposable income includes interest on last period's bill holdings and subtracts tax.", equation:"YD = Y − TX + r₋₁Bh₋₁" },
      { id:"C", symbol:"C", label:"Consumption", type:"flow", x:455, y:300, description:"Consumption responds to current disposable income and opening wealth.", equation:"C = α₁YD + α₂V₋₁" },
      { id:"Vlag", symbol:"V₋₁", label:"Opening wealth", type:"stock", x:260, y:280, description:"Money plus bills inherited from the previous period supports current consumption.", equation:"V₋₁ = Hh₋₁ + Bh₋₁" },
      { id:"V", symbol:"V", label:"Closing wealth", type:"stock", x:790, y:230, description:"Unconsumed disposable income accumulates into household wealth.", equation:"V = V₋₁ + YD − C" },
      { id:"Bh", symbol:"Bh", label:"Bill demand", type:"stock", x:680, y:400, description:"Households allocate a share of wealth to bills; the share rises with the bill rate and falls with the income-to-wealth ratio.", equation:"Bh = V(λ₀ + λ₁r − λ₂YD/V)" },
      { id:"Hh", symbol:"Hh", label:"Money demand", type:"stock", x:855, y:420, description:"The residual of household wealth not allocated to bills is held as money.", equation:"Hh = V − Bh" }
    ],
    edges: [
      ["G","Y","demand"], ["C","Y","demand"], ["Y","TX","tax base"], ["Y","YD","income"], ["TX","YD","subtract"],
      ["r","YD","interest"], ["Blag","YD","interest"], ["YD","C","propensity"], ["Vlag","C","wealth effect"], ["YD","V","saving"], ["C","V","subtract"], ["Vlag","V","carry"],
      ["V","Bh","allocate"], ["r","Bh","yield"], ["YD","Bh","liquidity"], ["V","Hh","residual"], ["Bh","Hh","subtract"], ["Bh","Blag","next period","identity"]
    ],
    controls: [
      { id:"G", label:"Government spending · G", min:10, max:40, step:1, value:20 },
      { id:"r", label:"Bill rate · r", min:0, max:.08, step:.005, value:.025 },
      { id:"theta", label:"Tax rate · θ", min:.1, max:.4, step:.01, value:.2 },
      { id:"lambda0", label:"Base bill share · λ₀", min:.35, max:.8, step:.01, value:.635 }
    ]
  },
  {
    number:"05", short:"Model LP", title:"Duration enters the balance sheet",
    label:"Chapter 05 · Long-term bonds, capital gains + liquidity preference", meta:"12 variables · Model LP",
    summary:"LP adds perpetual government bonds alongside money and bills. A change in the long rate changes the bond price immediately, creating capital gains or losses that move household wealth and consumption.",
    lab:"Set a new long-bond yield for period 10. The repricing creates a one-time capital gain or loss, while liquidity preference divides wealth among money, bills and perpetuities.",
    model:"LP",
    nodes: [
      { id:"G", symbol:"G", label:"Govt spending", type:"external", x:70, y:80, description:"Government purchases remain an exogenous source of aggregate demand.", equation:"G = exogenous" },
      { id:"Y", symbol:"Y", label:"National income", type:"flow", x:255, y:80, description:"Output is the sum of household consumption and government spending.", equation:"Y = C + G" },
      { id:"YDr", symbol:"YDʳ", label:"Regular income", type:"flow", x:455, y:95, description:"Regular disposable income includes bill interest and the coupon paid by perpetuities, but excludes capital gains.", equation:"YDʳ = Y − T + rᵦ₋₁Bh₋₁ + BLh₋₁" },
      { id:"C", symbol:"C", label:"Consumption", type:"flow", x:260, y:270, description:"Consumption responds to expected regular disposable income and opening wealth.", equation:"C = α₁YDʳᵉ + α₂V₋₁" },
      { id:"Vlag", symbol:"V₋₁", label:"Opening wealth", type:"stock", x:75, y:310, description:"The prior portfolio carries financial history into current spending and wealth accumulation.", equation:"V₋₁ = Hh₋₁ + Bh₋₁ + pBL₋₁·BLh₋₁" },
      { id:"rb", symbol:"rᵦ", label:"Bill rate", type:"external", x:75, y:465, description:"The short rate raises bill income and shifts desired portfolio shares.", equation:"rᵦ = r̄ᵦ" },
      { id:"pBL", symbol:"pBL", label:"Bond price", type:"external", x:450, y:455, description:"A perpetuity paying one unit per period has a price inversely related to its yield.", equation:"rBL = 1 / pBL" },
      { id:"CG", symbol:"CG", label:"Capital gain", type:"flow", x:620, y:435, description:"Existing long bonds gain or lose value when their market price changes.", equation:"CG = (pBL − pBL₋₁)BLh₋₁" },
      { id:"V", symbol:"V", label:"Closing wealth", type:"stock", x:650, y:245, description:"Saving and bond revaluation jointly update household wealth.", equation:"V = V₋₁ + YDʳ − C + CG" },
      { id:"Bh", symbol:"Bh", label:"Bill holdings", type:"stock", x:825, y:125, description:"Short bills are one interest-bearing component of the household portfolio.", equation:"Bh = Vᵉ(λ₂₀ + λ₂₂rᵦ − λ₂₃ERrBL − λ₂₄YDʳᵉ/Vᵉ)" },
      { id:"BLh", symbol:"BLh", label:"Long bonds", type:"stock", x:825, y:300, description:"Demand for perpetuities rises with their expected return and falls with the competing bill rate.", equation:"BLh = Vᵉ(λ₃₀ − λ₃₂rᵦ + λ₃₃ERrBL − λ₃₄YDʳᵉ/Vᵉ) / pBL" },
      { id:"Hh", symbol:"Hh", label:"Money", type:"stock", x:825, y:475, description:"Money is the liquid residual after wealth is allocated to bills and long bonds.", equation:"Hh = V − Bh − pBL·BLh" }
    ],
    edges: [
      ["G","Y","demand"], ["C","Y","demand"], ["Y","YDr","income"], ["Bh","YDr","bill interest"], ["BLh","YDr","coupon"], ["YDr","C","expected income"], ["Vlag","C","wealth effect"],
      ["pBL","CG","reprice"], ["BLh","CG","position"], ["CG","V","capital gain"], ["YDr","V","saving"], ["C","V","subtract"], ["Vlag","V","carry"],
      ["V","Bh","allocate"], ["rb","Bh","short yield"], ["V","BLh","allocate"], ["pBL","BLh","long yield"], ["V","Hh","residual"], ["Bh","Hh","subtract"], ["BLh","Hh","subtract"]
    ],
    controls: [
      { id:"G", label:"Government spending · G", min:10, max:40, step:1, value:20 },
      { id:"rb", label:"Bill yield · rᵦ", min:.005, max:.08, step:.005, value:.025 },
      { id:"rbl", label:"Long yield at t10 · rBL", min:.02, max:.1, step:.005, value:.05 },
      { id:"lambdaLong", label:"Long-bond wealth share", min:.15, max:.55, step:.01, value:.35 }
    ]
  },
  {
    number:"06", short:"Model REG", title:"One country, two regional balances",
    label:"Chapter 06 · Introducing the open economy", meta:"10 variables · Model REG",
    summary:"REG divides the PC economy into North and South while retaining one currency, one government and one central bank. Each region’s imports are the other region’s exports, so trade and fiscal balances must reconcile.",
    lab:"Change regional spending and import propensities. A region that imports more than it exports accumulates an offsetting private or government balance elsewhere in the shared system.",
    model:"REG",
    nodes: [
      { id:"GN", symbol:"Gᴺ", label:"North spending", type:"external", x:75, y:75, description:"Government purchases directed to firms in the North add to Northern demand.", equation:"Gᴺ = exogenous" },
      { id:"CN", symbol:"Cᴺ", label:"North consumption", type:"flow", x:75, y:265, description:"Northern households consume from Northern disposable income and opening wealth.", equation:"Cᴺ = α₁ᴺYDᴺ + α₂ᴺVᴺ₋₁" },
      { id:"VN", symbol:"Vᴺ", label:"North wealth", type:"stock", x:75, y:455, description:"Northern saving accumulates as household wealth in money and government bills.", equation:"Vᴺ = Vᴺ₋₁ + YDᴺ − Cᴺ" },
      { id:"YN", symbol:"Yᴺ", label:"North income", type:"flow", x:285, y:175, description:"Northern output includes domestic demand and exports to the South, less Northern imports.", equation:"Yᴺ = Cᴺ + Gᴺ + Xᴺ − IMᴺ" },
      { id:"IMN", symbol:"IMᴺ", label:"North imports", type:"flow", x:410, y:390, description:"Northern imports rise proportionally with Northern income and become Southern exports.", equation:"IMᴺ = μᴺYᴺ = Xˢ" },
      { id:"IMS", symbol:"IMˢ", label:"South imports", type:"flow", x:510, y:105, description:"Southern imports rise with Southern income and are simultaneously Northern exports.", equation:"IMˢ = μˢYˢ = Xᴺ" },
      { id:"YS", symbol:"Yˢ", label:"South income", type:"flow", x:635, y:275, description:"Southern output includes domestic demand and exports to the North, less Southern imports.", equation:"Yˢ = Cˢ + Gˢ + Xˢ − IMˢ" },
      { id:"GS", symbol:"Gˢ", label:"South spending", type:"external", x:845, y:75, description:"Government purchases directed to the South support Southern output.", equation:"Gˢ = exogenous" },
      { id:"CS", symbol:"Cˢ", label:"South consumption", type:"flow", x:845, y:265, description:"Southern consumption responds to its own disposable income and inherited wealth.", equation:"Cˢ = α₁ˢYDˢ + α₂ˢVˢ₋₁" },
      { id:"VS", symbol:"Vˢ", label:"South wealth", type:"stock", x:845, y:455, description:"Southern disposable income not consumed accumulates as household wealth.", equation:"Vˢ = Vˢ₋₁ + YDˢ − Cˢ" }
    ],
    edges: [
      ["GN","YN","demand"], ["CN","YN","demand"], ["YN","IMN","import demand"], ["IMN","YN","subtract"], ["IMS","YN","exports"], ["YN","CN","income"], ["VN","CN","wealth effect"], ["YN","VN","saving"], ["CN","VN","subtract"],
      ["GS","YS","demand"], ["CS","YS","demand"], ["YS","IMS","import demand"], ["IMS","YS","subtract"], ["IMN","YS","exports"], ["YS","CS","income"], ["VS","CS","wealth effect"], ["YS","VS","saving"], ["CS","VS","subtract"]
    ],
    controls: [
      { id:"GN", label:"North spending · Gᴺ", min:10, max:35, step:1, value:20 },
      { id:"GS", label:"South spending · Gˢ", min:10, max:35, step:1, value:20 },
      { id:"muN", label:"North import propensity · μᴺ", min:.05, max:.35, step:.01, value:.15 },
      { id:"muS", label:"South import propensity · μˢ", min:.05, max:.35, step:.01, value:.25 }
    ]
  },
  {
    number:"07", short:"Model BMW", title:"Banks create the money firms need",
    label:"Chapter 07 · A simple model with private bank money", meta:"11 variables · Model BMW",
    summary:"BMW returns to a closed economy and introduces commercial-bank loans and deposits. Investment creates a financing need; banks accommodate loans, and the matching deposits become household wealth.",
    lab:"Change firms’ desired capital ratio, investment adjustment speed and the loan rate. The experiment follows output, productive capital and the matching stock of bank credit.",
    model:"BMW",
    nodes: [
      { id:"C7", symbol:"C", label:"Consumption", type:"flow", x:70, y:75, description:"Households consume from current disposable income and opening deposits.", equation:"C = α₀ + α₁YD + α₂M₋₁" },
      { id:"Y7", symbol:"Y", label:"Output", type:"flow", x:265, y:75, description:"Closed-economy output supplies consumption and investment goods.", equation:"Y = C + I" },
      { id:"WB7", symbol:"WB", label:"Wage bill", type:"flow", x:470, y:75, description:"Firms pay wages after interest costs and depreciation allowances.", equation:"WB = Y − rₗ₋₁L₋₁ − AF" },
      { id:"YD7", symbol:"YD", label:"Disposable income", type:"flow", x:665, y:150, description:"Households receive wages and interest on their bank deposits.", equation:"YD = WB + rₘ₋₁M₋₁" },
      { id:"M7", symbol:"M", label:"Bank deposits", type:"stock", x:845, y:285, description:"Deposits are bank liabilities and household assets created alongside loans.", equation:"M = M₋₁ + YD − C" },
      { id:"RL7", symbol:"rₗ", label:"Loan rate", type:"external", x:845, y:75, description:"Banks set the loan rate exogenously in the basic BMW model.", equation:"rₗ = r̄ₗ; rₘ = rₗ" },
      { id:"I7", symbol:"I", label:"Investment", type:"flow", x:270, y:285, description:"Firms close part of the gap between desired and existing productive capital.", equation:"I = γ(Kᵀ − K₋₁) + DA" },
      { id:"KT7", symbol:"Kᵀ", label:"Target capital", type:"flow", x:70, y:440, description:"Desired productive capacity is proportional to prior output.", equation:"Kᵀ = κY₋₁" },
      { id:"K7", symbol:"K", label:"Capital stock", type:"stock", x:465, y:440, description:"Gross investment adds to productive capital while depreciation removes from it.", equation:"K = K₋₁ + I − DA" },
      { id:"L7", symbol:"L", label:"Bank loans", type:"stock", x:665, y:390, description:"Firms borrow to finance investment beyond depreciation allowances.", equation:"L = L₋₁ + I − AF" },
      { id:"B7", symbol:"BANK", label:"Commercial bank", type:"actor", x:845, y:460, description:"The bank accommodates firms’ loan demand and creates matching deposits.", equation:"ΔMˢ = ΔLˢ" }
    ],
    edges: [
      ["C7","Y7","demand"], ["I7","Y7","demand"], ["Y7","WB7","sales"], ["RL7","WB7","interest cost"], ["WB7","YD7","wages"], ["M7","YD7","deposit interest"], ["YD7","C7","income"], ["M7","C7","wealth effect"],
      ["Y7","KT7","capacity norm"], ["KT7","I7","capital gap"], ["K7","I7","existing capital"], ["I7","K7","accumulate"], ["I7","L7","finance"], ["RL7","L7","loan cost"], ["L7","B7","bank asset"], ["B7","M7","creates deposits"]
    ],
    controls: [
      { id:"alpha0BMW", label:"Autonomous consumption · α₀", min:0, max:15, step:1, value:5 },
      { id:"kappaBMW", label:"Target capital/output · κ", min:1, max:2.5, step:.1, value:1.5 },
      { id:"gammaBMW", label:"Investment adjustment · γ", min:.05, max:.45, step:.05, value:.2 },
      { id:"rLBMW", label:"Loan rate · rₗ", min:.005, max:.08, step:.005, value:.03 }
    ]
  },
  {
    number:"08", short:"Inventory bridge", title:"Production happens before demand is known",
    label:"Chapter 08 · Time, inventories, profits + pricing", meta:"9 concepts · Accounting bridge",
    summary:"Chapter 8 is a bridge rather than a closed model. It introduces dated decisions: firms form sales expectations, produce in advance, absorb forecast errors in inventories, calculate historic costs and set prices with a markup.",
    lab:"Apply a demand change at period 10. Watch production chase expected sales while inventories absorb the forecast error—the timing mechanism that later drives profits and inflation.",
    model:"INV",
    nodes: [
      { id:"SE8", symbol:"sᵉ", label:"Expected sales", type:"flow", x:70, y:90, description:"Production plans begin with expectations formed before current sales are observed.", equation:"sᵉₜ = sᵉₜ₋₁ + β(sₜ₋₁ − sᵉₜ₋₁)" },
      { id:"INT8", symbol:"inᵀ", label:"Target inventory", type:"stock", x:265, y:90, description:"Firms desire an inventory buffer proportional to expected sales.", equation:"inᵀ = σᵀsᵉ" },
      { id:"Q8", symbol:"y", label:"Production", type:"flow", x:470, y:90, description:"Output covers expected sales and gradually closes the inventory gap.", equation:"y = sᵉ + γ(inᵀ − in₋₁)" },
      { id:"S8", symbol:"s", label:"Realized sales", type:"external", x:845, y:90, description:"Actual demand is only known after production decisions have been made.", equation:"s = realized demand" },
      { id:"IN8", symbol:"in", label:"Closing inventory", type:"stock", x:665, y:245, description:"Unsold production accumulates; unexpectedly strong sales run inventories down.", equation:"in = in₋₁ + y − s" },
      { id:"UC8", symbol:"UC", label:"Historic unit cost", type:"flow", x:470, y:390, description:"Inventory valuation makes costs depend on when goods were produced.", equation:"UC = (WB + opening inventory cost) / available goods" },
      { id:"P8", symbol:"p", label:"Price", type:"flow", x:665, y:455, description:"Firms set price as a markup over normal historic unit cost.", equation:"p = (1 + φ)NHUC" },
      { id:"F8", symbol:"F", label:"Realized profit", type:"flow", x:845, y:330, description:"Profits reconcile sales revenue, wage costs, interest and inventory revaluation.", equation:"F = S − WB + ΔIN − rₗ₋₁IN₋₁" },
      { id:"E8", symbol:"↻", label:"Expectation update", type:"external", x:265, y:455, description:"Forecast errors feed the next period rather than being solved away instantly.", equation:"errorₜ = sₜ − sᵉₜ" }
    ],
    edges: [
      ["SE8","INT8","inventory norm"], ["SE8","Q8","planned sales"], ["INT8","Q8","inventory gap"], ["Q8","IN8","add output"], ["S8","IN8","subtract sales"], ["IN8","UC8","valuation"], ["Q8","UC8","unit cost"], ["UC8","P8","markup"], ["S8","F8","revenue"], ["IN8","F8","stock change"], ["P8","F8","sales value"], ["S8","E8","forecast error"], ["E8","SE8","next period","identity"]
    ],
    controls: [
      { id:"demandINV", label:"Demand after t10", min:70, max:135, step:5, value:85 },
      { id:"sigmaINV", label:"Target inventory/sales · σᵀ", min:.05, max:.4, step:.01, value:.2 },
      { id:"gammaINV", label:"Inventory adjustment · γ", min:.1, max:.8, step:.05, value:.35 },
      { id:"markupINV", label:"Price markup · φ", min:.05, max:.5, step:.01, value:.25 }
    ]
  },
  {
    number:"09", short:"Model DIS", title:"Inventories turn demand into inflation",
    label:"Chapter 09 · Private bank money, inventories + inflation", meta:"11 variables · Model DIS/DISINF",
    summary:"DIS combines bank-financed production with explicit inventories and price setting. DISINF then endogenizes wages, allowing wage costs, markups and demand pressure to generate a full inflation process.",
    lab:"Shock demand at period 10 and change the inventory norm or wage response. Output adjusts through production, inventories buffer the surprise, and cost pressure moves the price index.",
    model:"DIS",
    nodes: [
      { id:"D9", symbol:"s", label:"Sales demand", type:"external", x:70, y:75, description:"Household and government demand determines realized sales after firms have planned production.", equation:"s = c + g" },
      { id:"SE9", symbol:"sᵉ", label:"Expected sales", type:"flow", x:70, y:260, description:"Firms adapt expected sales toward recently realized demand.", equation:"sᵉ = s₋₁ + adaptive correction" },
      { id:"IT9", symbol:"inᵀ", label:"Target inventory", type:"stock", x:265, y:75, description:"The desired stock of goods is tied to expected sales and may respond to financing costs.", equation:"inᵀ = σᵀsᵉ" },
      { id:"Y9", symbol:"y", label:"Real output", type:"flow", x:265, y:260, description:"Production covers expected sales and closes part of the inventory gap.", equation:"y = sᵉ + γ(inᵀ − in₋₁)" },
      { id:"IN9", symbol:"in", label:"Inventories", type:"stock", x:465, y:400, description:"Inventory is the physical buffer between production and realized sales.", equation:"in = in₋₁ + y − s" },
      { id:"N9", symbol:"N", label:"Employment", type:"flow", x:465, y:75, description:"Employment follows the labor required to produce current output.", equation:"N = y / pr" },
      { id:"W9", symbol:"W", label:"Wage rate", type:"flow", x:665, y:75, description:"DIS takes wages as given; DISINF lets wage claims respond to employment and prices.", equation:"W = W₋₁(1 + wage response)" },
      { id:"UC9", symbol:"UC", label:"Unit cost", type:"flow", x:665, y:245, description:"Wages, productivity and inventory finance determine unit cost.", equation:"UC = W/pr + financing cost" },
      { id:"P9", symbol:"p", label:"Price level", type:"flow", x:845, y:245, description:"Prices are set as a markup on normal historic unit costs.", equation:"p = (1 + φ)NHUC" },
      { id:"PI9", symbol:"π", label:"Inflation", type:"flow", x:845, y:430, description:"Inflation is the proportional change in the price level.", equation:"π = (p − p₋₁) / p₋₁" },
      { id:"L9", symbol:"L", label:"Inventory loans", type:"stock", x:665, y:455, description:"Firms borrow to finance the cost of goods held in inventory.", equation:"L = IN" }
    ],
    edges: [
      ["D9","SE9","update"], ["SE9","IT9","inventory norm"], ["SE9","Y9","planned sales"], ["IT9","Y9","inventory gap"], ["Y9","IN9","production"], ["D9","IN9","sales"], ["Y9","N9","labor demand"], ["N9","W9","wage pressure"], ["W9","UC9","labor cost"], ["IN9","UC9","historic cost"], ["UC9","P9","markup"], ["P9","PI9","price change"], ["IN9","L9","finance stock"], ["L9","UC9","interest cost"]
    ],
    controls: [
      { id:"demandDIS", label:"Demand after t10", min:80, max:140, step:5, value:120 },
      { id:"sigmaDIS", label:"Target inventory/sales · σᵀ", min:.05, max:.35, step:.01, value:.18 },
      { id:"gammaDIS", label:"Inventory adjustment · γ", min:.1, max:.8, step:.05, value:.35 },
      { id:"wageDIS", label:"Wage response", min:0, max:.08, step:.005, value:.02 }
    ]
  },
  {
    number:"10", short:"Model INSOUT", title:"The whole monetary hierarchy connects",
    label:"Chapter 10 · A model with both inside and outside money", meta:"11 nodes · Model INSOUT spine",
    summary:"INSOUT joins households, firms, commercial banks, government and the central bank. Loans and deposits form inside money; cash, reserves and government securities form outside money; bank liquidity and reserve rules connect both layers.",
    lab:"Raise reserve or liquidity targets and change government demand. The focused banking experiment shows how balance-sheet constraints alter loan capacity, reserves and aggregate output.",
    model:"INSOUT",
    nodes: [
      { id:"HH10", symbol:"HH", label:"Households", type:"actor", x:70, y:90, description:"Households earn income, consume and allocate wealth across cash, deposits and government securities.", equation:"V = Hh + M1 + M2 + Bh + pBL·BLh" },
      { id:"C10", symbol:"C", label:"Consumption", type:"flow", x:260, y:90, description:"Real consumption responds to expected real disposable income and wealth.", equation:"c = α₁ydʳᵉ + α₂v₋₁" },
      { id:"F10", symbol:"FIRMS", label:"Producing firms", type:"actor", x:460, y:90, description:"Firms produce, price, hold inventories and borrow to finance working capital.", equation:"Lᵈ = inventory finance + production finance" },
      { id:"Y10", symbol:"Y", label:"Output", type:"flow", x:650, y:90, description:"Demand for consumption and government goods determines sales and production.", equation:"Y = C + G + ΔIN" },
      { id:"G10", symbol:"GOV", label:"Government", type:"actor", x:845, y:90, description:"Government spends, taxes and supplies bills and bonds to finance its deficit.", equation:"PSBR = G + interest − T" },
      { id:"L10", symbol:"L", label:"Bank loans", type:"stock", x:365, y:280, description:"Commercial-bank assets accommodate eligible firm credit demand subject to bank constraints.", equation:"Lˢ = Lᵈ" },
      { id:"M10", symbol:"M", label:"Bank deposits", type:"stock", x:170, y:300, description:"Checking and term deposits are inside-money liabilities of commercial banks.", equation:"M1ˢ + M2ˢ = household deposit holdings" },
      { id:"B10", symbol:"BANK", label:"Commercial banks", type:"actor", x:465, y:455, description:"Banks connect inside money to reserves, bills and central-bank advances.", equation:"assets = L + Hᵇ + Bᵇ; liabilities = M1 + M2 + A" },
      { id:"R10", symbol:"Hᵇ", label:"Bank reserves", type:"stock", x:650, y:360, description:"Banks demand cash reserves against deposits and payment needs.", equation:"Hᵇᵈ = ρ₁M1 + ρ₂M2" },
      { id:"CB10", symbol:"CB", label:"Central bank", type:"actor", x:845, y:455, description:"The central bank supplies reserves and advances and holds government bills.", equation:"Hˢ = Hʰ + Hᵇ; Aˢ = Aᵈ" },
      { id:"GB10", symbol:"B/BL", label:"Govt securities", type:"stock", x:845, y:280, description:"Bills and bonds are government liabilities held by households, banks and the central bank.", equation:"Bˢ = Bh + Bb + Bcb" }
    ],
    edges: [
      ["HH10","C10","spending"], ["C10","F10","sales"], ["F10","Y10","production"], ["G10","Y10","public demand"], ["F10","L10","borrows"], ["L10","B10","bank asset"], ["B10","M10","creates deposits"], ["M10","HH10","inside money"],
      ["M10","R10","reserve base"], ["R10","B10","liquidity"], ["CB10","R10","supplies reserves"], ["G10","GB10","issues"], ["GB10","B10","liquid asset"], ["GB10","HH10","portfolio asset"], ["CB10","B10","advances"]
    ],
    controls: [
      { id:"gINS", label:"Government demand · G", min:15, max:45, step:1, value:25 },
      { id:"reserveINS", label:"Required reserve ratio · ρ", min:.04, max:.25, step:.01, value:.1 },
      { id:"liquidityINS", label:"Bank liquidity target", min:.05, max:.3, step:.01, value:.12 },
      { id:"alphaINS", label:"Income propensity · α₁", min:.45, max:.85, step:.01, value:.68 }
    ]
  },
  {
    number:"11", short:"Model GROWTH", title:"Stocks, capacity and policy grow together",
    label:"Chapter 11 · A growth model prototype", meta:"11 nodes · Model GROWTH spine",
    summary:"GROWTH embeds every major sector in an expanding economy. Investment builds productive capacity, productivity and wages evolve, firms finance accumulation, and fiscal and monetary policy influence both the level and path of activity.",
    lab:"Set the trend rates for government demand, productivity, wages and investment. The experiment tracks whether demand and productive capacity expand together over forty periods.",
    model:"GROWTH",
    nodes: [
      { id:"G11", symbol:"G", label:"Govt demand", type:"external", x:70, y:75, description:"Government expenditure follows an exogenous or policy-guided growth path.", equation:"G = G₋₁(1 + gG)" },
      { id:"C11", symbol:"C", label:"Consumption", type:"flow", x:70, y:270, description:"Household demand grows with income and accumulated financial wealth.", equation:"C = α₁YD + α₂V₋₁" },
      { id:"Y11", symbol:"Y", label:"Real output", type:"flow", x:270, y:170, description:"Actual output is demand-led until productive capacity becomes binding.", equation:"Y = min(C + I + G, Yᶜ)" },
      { id:"K11", symbol:"K", label:"Capital stock", type:"stock", x:465, y:75, description:"Investment expands productive capacity while depreciation retires old capital.", equation:"K = K₋₁ + I − δK₋₁" },
      { id:"I11", symbol:"I", label:"Investment", type:"flow", x:465, y:270, description:"Firms invest to expand capacity and meet their target accumulation path.", equation:"I = desired accumulation + replacement" },
      { id:"PR11", symbol:"pr", label:"Productivity", type:"external", x:270, y:455, description:"Labor productivity follows a trend that allows output to grow faster than employment.", equation:"pr = pr₋₁(1 + gpr)" },
      { id:"N11", symbol:"N", label:"Employment", type:"flow", x:665, y:75, description:"Employment is the labor required to produce current real output.", equation:"N = Y / pr" },
      { id:"W11", symbol:"W", label:"Wage rate", type:"flow", x:845, y:75, description:"Nominal wage growth and productivity jointly shape unit labor costs.", equation:"W = W₋₁(1 + gW)" },
      { id:"P11", symbol:"p", label:"Price level", type:"flow", x:845, y:270, description:"Firms set prices over normal costs, connecting distribution to inflation.", equation:"p = (1 + φ) normal unit cost" },
      { id:"F11", symbol:"FU", label:"Retained earnings", type:"flow", x:665, y:360, description:"Undistributed profits finance part of gross investment internally.", equation:"FU = target internal-finance share × I" },
      { id:"L11", symbol:"L", label:"Loans + equity", type:"stock", x:465, y:455, description:"External finance closes the gap between investment and retained earnings.", equation:"ΔL + equity issues = I − FU" }
    ],
    edges: [
      ["G11","Y11","public demand"], ["C11","Y11","private demand"], ["I11","Y11","investment demand"], ["Y11","C11","income"], ["K11","Y11","capacity"], ["I11","K11","accumulate"], ["K11","I11","capacity target"], ["PR11","N11","productivity"], ["Y11","N11","labor demand"], ["N11","W11","wage pressure"], ["W11","P11","unit cost"], ["Y11","F11","profits"], ["F11","I11","internal finance"], ["I11","L11","finance gap"], ["L11","I11","credit supply"]
    ],
    controls: [
      { id:"gGov11", label:"Government growth · gG", min:0, max:.06, step:.005, value:.025 },
      { id:"gProd11", label:"Productivity growth · gpr", min:0, max:.04, step:.005, value:.015 },
      { id:"gWage11", label:"Nominal wage growth · gW", min:0, max:.08, step:.005, value:.03 },
      { id:"invShare11", label:"Gross investment/capital", min:.04, max:.12, step:.005, value:.075 }
    ]
  }
];

let currentChapter = 2;
let selectedNode = null;

const el = id => document.getElementById(id);
const chapterNav = el("chapterNav");

chapters.forEach((chapter, index) => {
  const button = document.createElement("button");
  button.className = "chapter-tab";
  button.type = "button";
  button.dataset.chapter = index;
  button.innerHTML = `<small>CH. ${chapter.number}</small><strong>${chapter.short}</strong>`;
  button.addEventListener("click", () => renderChapter(index));
  chapterNav.appendChild(button);
});

function svgElement(name, attributes = {}) {
  const node = document.createElementNS(NS, name);
  Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value));
  return node;
}

function nodeCenter(chapter, id) {
  const node = chapter.nodes.find(item => item.id === id);
  return { x: node.x, y: node.y };
}

function edgePath(from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.hypot(dx, dy) || 1;
  const ux = dx / distance;
  const uy = dy / distance;
  const start = { x: from.x + ux * 65, y: from.y + uy * 31 };
  const end = { x: to.x - ux * 69, y: to.y - uy * 35 };
  const bend = Math.min(42, distance * .12) * (Math.abs(dy) < 30 ? 1 : 0);
  const mx = (start.x + end.x) / 2;
  const my = (start.y + end.y) / 2 - bend;
  return { d:`M ${start.x} ${start.y} Q ${mx} ${my} ${end.x} ${end.y}`, label:{ x:mx, y:my - 7 } };
}

function renderGraph(chapter) {
  const edgeLayer = el("edgeLayer");
  const nodeLayer = el("nodeLayer");
  edgeLayer.replaceChildren();
  nodeLayer.replaceChildren();

  chapter.edges.forEach((edge, index) => {
    const [fromId, toId, label, kind] = edge;
    const route = edgePath(nodeCenter(chapter, fromId), nodeCenter(chapter, toId));
    const path = svgElement("path", { d:route.d, class:`edge flowing ${kind || ""}`, "data-from":fromId, "data-to":toId });
    path.style.animationDelay = `${index * -90}ms`;
    edgeLayer.appendChild(path);
    const text = svgElement("text", { x:route.label.x, y:route.label.y, class:"edge-label", "text-anchor":"middle", "data-from":fromId, "data-to":toId });
    text.textContent = label;
    edgeLayer.appendChild(text);
  });

  chapter.nodes.forEach(node => {
    const group = svgElement("g", { class:"node", transform:`translate(${node.x - 66} ${node.y - 34})`, tabindex:"0", role:"button", "aria-label":`${node.label}: ${node.description}`, "data-id":node.id, "data-type":node.type });
    group.appendChild(svgElement("rect", { width:132, height:68, rx:3 }));
    group.appendChild(svgElement("rect", { class:"node-accent", width:5, height:68, rx:2 }));
    const symbol = svgElement("text", { x:16, y:28, class:"symbol" }); symbol.textContent = node.symbol;
    const label = svgElement("text", { x:16, y:49, class:"label" }); label.textContent = node.label;
    group.append(symbol, label);
    const select = () => selectNode(chapter, node.id);
    group.addEventListener("click", select);
    group.addEventListener("keydown", event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); select(); } });
    nodeLayer.appendChild(group);
  });
}

function selectNode(chapter, id) {
  selectedNode = id;
  const node = chapter.nodes.find(item => item.id === id);
  document.querySelectorAll(".node").forEach(item => {
    item.classList.toggle("selected", item.dataset.id === id);
  });
  document.querySelectorAll(".edge, .edge-label").forEach(item => {
    const active = item.dataset.from === id || item.dataset.to === id;
    item.classList.toggle("active", active);
  });
  el("nodeSymbol").textContent = node.symbol;
  el("nodeSymbol").className = `node-symbol ${node.type}`;
  el("inspectorTitle").textContent = node.label;
  el("nodeDescription").textContent = node.description;
  el("nodeEquation").textContent = node.equation;
  const connections = chapter.edges.filter(([from, to]) => from === id || to === id).map(([from, to, label]) => {
    const other = chapter.nodes.find(item => item.id === (from === id ? to : from));
    return `<span class="connection-chip">${from === id ? "→" : "←"} ${other.symbol} · ${label}</span>`;
  });
  el("connections").innerHTML = connections.join("") || '<span class="connection-chip">No direct links</span>';
}

function renderControls(chapter) {
  const controls = el("controls");
  controls.replaceChildren();
  if (!chapter.controls) {
    controls.innerHTML = `<div class="foundation-note"><p>${chapter.number === "01" ? "Accounting → behavior → simulation" : "Select a sector above to reveal its counterparties."}</p></div>`;
    renderFoundationChart(chapter.number);
    return;
  }
  chapter.controls.forEach(control => {
    const wrap = document.createElement("div");
    wrap.className = "control";
    wrap.innerHTML = `<label for="control-${control.id}"><span>${control.label}</span><output>${formatControl(control.value, control)}</output></label><input id="control-${control.id}" data-key="${control.id}" type="range" min="${control.min}" max="${control.max}" step="${control.step}" value="${control.value}" /><div class="control-scale"><span>${formatControl(control.min, control)}</span><span>${formatControl(control.max, control)}</span></div>`;
    wrap.querySelector("input").addEventListener("input", event => {
      wrap.querySelector("output").textContent = formatControl(Number(event.target.value), control);
      renderSimulation(chapter);
    });
    controls.appendChild(wrap);
  });
  renderSimulation(chapter);
}

function formatControl(value, control) {
  if (["theta","alpha1","alpha2","lambda0","lambdaLong","kappaBMW","gammaBMW"].includes(control.id)) return Number(value).toFixed(2);
  if (["r","rb","rbl","muN","muS","rLBMW","sigmaINV","gammaINV","markupINV","sigmaDIS","gammaDIS","wageDIS","reserveINS","liquidityINS","alphaINS","gGov11","gProd11","gWage11","invShare11"].includes(control.id)) return `${(Number(value) * 100).toFixed(1)}%`;
  return Number(value).toFixed(0);
}

function currentParams(chapter) {
  return Object.fromEntries(chapter.controls.map(control => [control.id, Number(el(`control-${control.id}`).value)]));
}

function simulateSIM(p) {
  const rows = []; let H = 0; let C = 0;
  for (let t = 0; t <= 40; t += 1) {
    for (let k = 0; k < 100; k += 1) {
      const Y = C + p.G; const T = p.theta * Y; const YD = Y - T;
      const nextC = p.alpha1 * YD + p.alpha2 * H;
      if (Math.abs(nextC - C) < 1e-8) { C = nextC; break; }
      C = nextC;
    }
    const Y = C + p.G; const YD = Y * (1 - p.theta);
    H += YD - C;
    rows.push({ Y, C, H });
  }
  return { rows, series:[{key:"Y",label:"Income",color:"#ff8b61"},{key:"C",label:"Consumption",color:"#62c6b9"},{key:"H",label:"Money",color:"#e6c36b"}] };
}

function simulatePC(p) {
  const rows = []; let V = 0; let Bh = 0; let C = 0;
  const alpha1 = .6, alpha2 = .4, lambda1 = .05, lambda2 = .01;
  for (let t = 0; t <= 40; t += 1) {
    const Vlag = V, Blag = Bh, interest = p.r * Blag;
    for (let k = 0; k < 100; k += 1) {
      const Y = C + p.G; const TX = p.theta * (Y + interest); const YD = Y - TX + interest;
      const nextC = alpha1 * YD + alpha2 * Vlag;
      if (Math.abs(nextC - C) < 1e-8) { C = nextC; break; }
      C = nextC;
    }
    const Y = C + p.G; const TX = p.theta * (Y + interest); const YD = Y - TX + interest;
    V = Vlag + YD - C;
    const share = Math.max(0, Math.min(1, p.lambda0 + lambda1 * p.r - lambda2 * (V ? YD / V : 0)));
    Bh = V * share;
    rows.push({ Y, V, Bh, Hh:V - Bh });
  }
  return { rows, series:[{key:"Y",label:"Income",color:"#ff8b61"},{key:"Bh",label:"Bills",color:"#62c6b9"},{key:"Hh",label:"Money",color:"#e6c36b"}] };
}

function simulateLP(p) {
  const rows = []; let V = 0; let Bh = 0; let BLh = 0; let C = 0; let pBL = 25;
  const theta = .2, alpha1 = .6, alpha2 = .4;
  for (let t = 0; t <= 40; t += 1) {
    const Vlag = V, oldPrice = pBL;
    pBL = t < 10 ? 25 : 1 / p.rbl;
    const CG = (pBL - oldPrice) * BLh;
    const interest = p.rb * Bh + BLh;
    for (let k = 0; k < 100; k += 1) {
      const Y = C + p.G; const TX = theta * (Y + interest); const YDr = Y - TX + interest;
      const nextC = alpha1 * YDr + alpha2 * Vlag;
      if (Math.abs(nextC - C) < 1e-8) { C = nextC; break; }
      C = nextC;
    }
    const Y = C + p.G; const TX = theta * (Y + interest); const YDr = Y - TX + interest;
    V = Math.max(0, Vlag + YDr - C + CG);
    const billShare = Math.max(.12, Math.min(.6, .34 + 1.2 * (p.rb - .025)));
    const longValue = V * p.lambdaLong;
    Bh = V * Math.min(billShare, 1 - p.lambdaLong);
    BLh = pBL ? longValue / pBL : 0;
    rows.push({ Y, V, BLV:longValue, CG });
  }
  return { rows, series:[{key:"Y",label:"Income",color:"#ff8b61"},{key:"V",label:"Wealth",color:"#62c6b9"},{key:"BLV",label:"Long bonds",color:"#e6c36b"}] };
}

function simulateREG(p) {
  const rows = []; let VN = 0; let VS = 0; let BhN = 0; let BhS = 0; let CN = 0; let CS = 0;
  const theta = .2, alpha1 = .7, alpha2 = .3, r = .025, billShare = .67;
  for (let t = 0; t <= 40; t += 1) {
    const VNlag = VN, VSlag = VS, interestN = r * BhN, interestS = r * BhS;
    let YN = CN + p.GN, YS = CS + p.GS;
    for (let k = 0; k < 180; k += 1) {
      const IMN = p.muN * YN, IMS = p.muS * YS;
      const YDN = (1 - theta) * (YN + interestN); const YDS = (1 - theta) * (YS + interestS);
      const nextCN = alpha1 * YDN + alpha2 * VNlag; const nextCS = alpha1 * YDS + alpha2 * VSlag;
      const nextYN = nextCN + p.GN + IMS - IMN; const nextYS = nextCS + p.GS + IMN - IMS;
      if (Math.max(Math.abs(nextYN - YN), Math.abs(nextYS - YS)) < 1e-8) { CN = nextCN; CS = nextCS; YN = nextYN; YS = nextYS; break; }
      CN = nextCN; CS = nextCS; YN = nextYN; YS = nextYS;
    }
    const YDN = (1 - theta) * (YN + interestN); const YDS = (1 - theta) * (YS + interestS);
    VN = VNlag + YDN - CN; VS = VSlag + YDS - CS; BhN = billShare * VN; BhS = billShare * VS;
    const IMN = p.muN * YN, IMS = p.muS * YS;
    rows.push({ YN, YS, TBS:IMN - IMS });
  }
  return { rows, series:[{key:"YN",label:"North income",color:"#ff8b61"},{key:"YS",label:"South income",color:"#62c6b9"},{key:"TBS",label:"South trade bal.",color:"#e6c36b"}] };
}

function simulateBMW(p) {
  const rows = []; let K = 80; let L = 60; let M = 60; let C = 45; let Ylast = 80;
  const alpha1 = .6, alpha2 = .2, delta = .05;
  for (let t = 0; t <= 40; t += 1) {
    const Ktarget = p.kappaBMW * Ylast;
    const depreciation = delta * K;
    const I = Math.max(0, p.gammaBMW * (Ktarget - K) + depreciation);
    for (let k = 0; k < 120; k += 1) {
      const Y = C + I;
      const wages = Math.max(0, Y - p.rLBMW * L - depreciation);
      const YD = wages + p.rLBMW * M;
      const nextC = Math.max(0, p.alpha0BMW + alpha1 * YD + alpha2 * M);
      if (Math.abs(nextC - C) < 1e-8) { C = nextC; break; }
      C = nextC;
    }
    const Y = C + I;
    K = Math.max(0, K + I - depreciation);
    L = Math.max(0, L + I - depreciation);
    M = L;
    Ylast = Y;
    rows.push({ Y, K, L });
  }
  return { rows, series:[{key:"Y",label:"Output",color:"#ff8b61"},{key:"K",label:"Capital",color:"#62c6b9"},{key:"L",label:"Bank loans",color:"#e6c36b"}] };
}

function simulateInventory(p) {
  const rows = []; let expected = 100; let inventory = 20;
  for (let t = 0; t <= 40; t += 1) {
    const sales = t < 10 ? 100 : p.demandINV;
    const target = p.sigmaINV * expected;
    const production = Math.max(0, expected + p.gammaINV * (target - inventory));
    inventory = Math.max(0, inventory + production - sales);
    expected += .35 * (sales - expected);
    const unitCost = 1 + .004 * Math.max(0, target - inventory);
    const priceIndex = 100 * (1 + p.markupINV) * unitCost / 1.25;
    rows.push({ Production:production, Inventory:inventory, PriceIndex:priceIndex });
  }
  return { rows, series:[{key:"Production",label:"Production",color:"#ff8b61"},{key:"Inventory",label:"Inventories",color:"#62c6b9"},{key:"PriceIndex",label:"Price index",color:"#e6c36b"}] };
}

function simulateDIS(p) {
  const rows = []; let expected = 100; let inventory = 18; let wage = 1; const initialPrice = 1.25;
  for (let t = 0; t <= 40; t += 1) {
    const sales = t < 10 ? 100 : p.demandDIS;
    const target = p.sigmaDIS * expected;
    const output = Math.max(0, expected + p.gammaDIS * (target - inventory));
    inventory = Math.max(0, inventory + output - sales);
    const employmentPressure = (output - 100) / 100;
    wage *= Math.max(.98, 1 + .005 + p.wageDIS * employmentPressure);
    const price = 1.25 * wage;
    expected += .4 * (sales - expected);
    rows.push({ Output:output, Inventory:inventory, PriceIndex:100 * price / initialPrice });
  }
  return { rows, series:[{key:"Output",label:"Real output",color:"#ff8b61"},{key:"Inventory",label:"Inventories",color:"#62c6b9"},{key:"PriceIndex",label:"Price index",color:"#e6c36b"}] };
}

function simulateINSOUT(p) {
  const rows = []; let deposits = 100; let loans = 75; let consumption = 60;
  for (let t = 0; t <= 40; t += 1) {
    const reserves = p.reserveINS * deposits;
    const liquidAssets = p.liquidityINS * deposits;
    const lendingCapacity = Math.max(0, deposits - reserves - liquidAssets);
    const desiredLoans = Math.max(0, .72 * (consumption + p.gINS) + 12);
    loans += .28 * (Math.min(desiredLoans, lendingCapacity) - loans);
    const investment = .08 * loans;
    let output = consumption + p.gINS + investment;
    for (let k = 0; k < 80; k += 1) {
      const income = .76 * output;
      const nextConsumption = p.alphaINS * income + .05 * deposits;
      const nextOutput = nextConsumption + p.gINS + investment;
      consumption = nextConsumption;
      if (Math.abs(nextOutput - output) < 1e-8) { output = nextOutput; break; }
      output = nextOutput;
    }
    deposits = Math.max(1, 100 + .65 * (loans - 75));
    rows.push({ Output:output, Loans:loans, Reserves:p.reserveINS * deposits });
  }
  return { rows, series:[{key:"Output",label:"Output",color:"#ff8b61"},{key:"Loans",label:"Bank loans",color:"#62c6b9"},{key:"Reserves",label:"Reserves",color:"#e6c36b"}] };
}

function simulateGrowth(p) {
  const rows = []; let K = 300; let G = 40; let C = 120; let wealth = 100; let productivity = 1; let wage = 1; let output = 190;
  const delta = .04, capitalOutput = 1.5;
  for (let t = 0; t <= 40; t += 1) {
    if (t > 0) G *= 1 + p.gGov11;
    productivity *= 1 + p.gProd11;
    wage *= 1 + p.gWage11;
    const investment = p.invShare11 * K;
    const capacity = K * productivity / capitalOutput;
    const demand = C + investment + G;
    output = Math.min(demand, capacity);
    const disposableIncome = .76 * output;
    C = .76 * disposableIncome + .025 * wealth;
    wealth = Math.max(0, wealth + disposableIncome - C);
    K = Math.max(0, K + investment - delta * K);
    const priceIndex = 100 * wage / productivity;
    rows.push({ Output:output, Capacity:capacity, PriceIndex:priceIndex });
  }
  return { rows, series:[{key:"Output",label:"Real output",color:"#ff8b61"},{key:"Capacity",label:"Productive capacity",color:"#62c6b9"},{key:"PriceIndex",label:"Price index",color:"#e6c36b"}] };
}

function renderSimulation(chapter) {
  const params = currentParams(chapter);
  const simulations = { SIM:simulateSIM, PC:simulatePC, LP:simulateLP, REG:simulateREG, BMW:simulateBMW, INV:simulateInventory, DIS:simulateDIS, INSOUT:simulateINSOUT, GROWTH:simulateGrowth };
  const titles = { SIM:"Income, consumption + money", PC:"Income + the household portfolio", LP:"Income, wealth + long bonds", REG:"Regional income + South trade balance", BMW:"Output, capital + private credit", INV:"The inventory timing loop", DIS:"Output, inventories + the price level", INSOUT:"Bank constraints + aggregate activity", GROWTH:"Demand and capacity through time" };
  const result = simulations[chapter.model](params);
  el("chartTitle").textContent = titles[chapter.model];
  drawChart(result.rows, result.series);
}

function drawChart(rows, series) {
  const svg = el("simulationChart");
  svg.replaceChildren();
  const bounds = { left:46, right:742, top:18, bottom:264 };
  const allValues = rows.flatMap(row => series.map(item => row[item.key])).filter(Number.isFinite);
  const rawMin = Math.min(...allValues, 0); const rawMax = Math.max(...allValues, 1);
  const pad = Math.max((rawMax - rawMin) * .08, 1);
  const min = rawMin < 0 ? rawMin - pad : 0; const max = rawMax + pad;
  const x = index => bounds.left + (index / (rows.length - 1)) * (bounds.right - bounds.left);
  const y = value => bounds.bottom - ((value - min) / (max - min)) * (bounds.bottom - bounds.top);
  for (let i = 0; i <= 4; i += 1) {
    const value = min + (max - min) * i / 4; const yy = y(value);
    svg.appendChild(svgElement("line", { x1:bounds.left, x2:bounds.right, y1:yy, y2:yy, class:"chart-grid" }));
    const label = svgElement("text", { x:bounds.left - 8, y:yy + 3, class:"chart-axis-label", "text-anchor":"end" }); label.textContent = value.toFixed(0); svg.appendChild(label);
  }
  [0,10,20,30,40].forEach(period => { const label = svgElement("text", { x:x(period), y:286, class:"chart-axis-label", "text-anchor":"middle" }); label.textContent = `t${period}`; svg.appendChild(label); });
  series.forEach(item => {
    const points = rows.map((row, index) => `${x(index)},${y(row[item.key])}`).join(" ");
    svg.appendChild(svgElement("polyline", { points, class:"chart-line", stroke:item.color }));
  });
  el("seriesLegend").innerHTML = series.map(item => `<span><i style="background:${item.color}"></i>${item.label}</span>`).join("");
  const last = rows.at(-1);
  el("chartReadout").innerHTML = series.map(item => `<div class="readout-item"><span>t40 · ${item.label}</span><strong style="color:${item.color}">${last[item.key].toFixed(2)}</strong></div>`).join("");
}

function renderFoundationChart(number) {
  el("chartTitle").textContent = number === "01" ? "The stock–flow sequence" : "A transaction recorded twice";
  el("seriesLegend").innerHTML = "";
  el("chartReadout").innerHTML = number === "01"
    ? '<div class="readout-item"><span>OPEN</span><strong>Stocks t−1</strong></div><div class="readout-item"><span>MOVE</span><strong>Flows t</strong></div><div class="readout-item"><span>CLOSE</span><strong>Stocks t</strong></div>'
    : '<div class="readout-item"><span>PAYER</span><strong>− transaction</strong></div><div class="readout-item"><span>PAYEE</span><strong>+ transaction</strong></div><div class="readout-item"><span>ROW SUM</span><strong>0</strong></div>';
  const svg = el("simulationChart"); svg.replaceChildren();
  const labels = number === "01" ? ["OPENING STOCKS","TRANSACTIONS","CLOSING STOCKS"] : ["SECTOR A","ONE PAYMENT","SECTOR B"];
  labels.forEach((label, i) => {
    const x = 80 + i * 290;
    svg.appendChild(svgElement("rect", { x, y:95, width:150, height:78, fill:i === 1 ? "#e75d2a" : "#f3efe5", stroke:"#e7e0d2" }));
    const text = svgElement("text", { x:x + 75, y:140, class:"chart-axis-label", "text-anchor":"middle" }); text.textContent = label; text.setAttribute("fill", i === 1 ? "#fff" : "#152721"); svg.appendChild(text);
    if (i < 2) { svg.appendChild(svgElement("line", { x1:x + 158, x2:x + 276, y1:134, y2:134, stroke:"#62c6b9", "stroke-width":"2" })); const arrow = svgElement("text", { x:x + 218, y:125, class:"chart-axis-label", "text-anchor":"middle" }); arrow.textContent = "→"; svg.appendChild(arrow); }
  });
}

function renderChapter(index) {
  currentChapter = index;
  const chapter = chapters[index];
  document.querySelectorAll(".chapter-tab").forEach((button, buttonIndex) => { button.classList.toggle("active", buttonIndex === index); button.setAttribute("aria-current", buttonIndex === index ? "page" : "false"); });
  el("chapterLabel").textContent = chapter.label;
  el("chapterTitle").textContent = chapter.title;
  el("chapterSummary").textContent = chapter.summary;
  el("graphMeta").textContent = chapter.meta;
  el("labDescription").textContent = chapter.lab;
  renderGraph(chapter);
  renderControls(chapter);
  selectNode(chapter, chapter.nodes[0].id);
}

el("resetGraph").addEventListener("click", () => {
  const chapter = chapters[currentChapter];
  selectNode(chapter, chapter.nodes[0].id);
});

renderChapter(currentChapter);
