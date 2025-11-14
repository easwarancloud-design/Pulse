#language added

from typing import List, Dict, Any
from typing_extensions import TypedDict

mapping={
"AI":"AssociateID",
"DI":"Domain_ID",
"WT":"Worker_Type",
"LN":"Last_Name",
"FN":"First_Name", 
"MN":"Middle_Name",
"CN":"Company_Name", 
"HD":"Hire_Date",
"CC":"cost center",
"EI":"Email_ID" ,
"SO":"supervisory organization",
"PN":"Phone_Number",
"MI":"Manager_ID",
"ME":"Manager_Email", 
"MLN":"Manager_Legal_Last_Name",
"MFN":"Manager_Legal_First_Name",
"MMN":"Manager_Legal_Middle_Name",
"MCN":"Manager_Company_Name",
"MDN":"Manager_Department_Name",
"BT":"Business_Title",
"OHD":"Original_Hire_Date",
"ET":"Employee_Type",
"CWT":"Contingent_Worker_Type", 
"CWS":"Contingent_Worker_Supplier",
"JF":"Job_Family",
"PT":"Position",
"WLD":"Work_Location_Description", 
"WLR":"Work_Location_ReferenceID",
"WLACE ":"Work_Location_Address_City",
"WLASP":"Work_Location_Address_State_or_Province",
"WLPC":"Work_Location_Postal_Code",
"WLACY":"Work_Location_Address_Country",
"FP":"FTE_percent",
"CG":"Compensation_Grade", 
"TT":"Time_Type",
"GZ":"Geo_Zone" ,
"JPM":"Job_Profile_MRP",
"SH":"Standard_Hours",
"WST":"Worker_Sub_Type", 
"ES":"Exemption_Status",
"DOB":"Date_of_Birth",
"CSD":"Continuous_Service_Date",
"TJP":"Time_in_Job_Profile"
}


class AgentState(TypedDict):
    query: str
    domainid: str
    chat_history: List
    task: str  # Intent extracted by OpenAI
    result: Any
    response: str  # Final response to the user
    prompt: str
    token: str
    phone_number: str
    end_point:str
    email: str
    app_category: str
    self_update: str
    can_update: str
    pre_task: str
    language: str
    include_birthdays: str
    include_anniversaries: str
    include_job_profile_duration: str

