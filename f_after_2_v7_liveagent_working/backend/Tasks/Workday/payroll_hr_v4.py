from modules.agent_dbs import redis_client
from modules.agent_state import AgentState,mapping
from modules.workflow_utils import replace_short_names
from Tasks.Workday.associate_info import store_associateinfo
import json
import ast

def get_payrollhr(state: AgentState):    

    domainid=str(state["domainid"])

    response_payroll=redis_client.hget(f"in_payrollinfo:{str(domainid)}", "data")
    

    if response_payroll is None:        
        store_payrollhr(str(domainid))
        response_payroll=redis_client.hget(f"in_payrollinfo:{str(domainid)}", "data")
    
    if response_payroll:        
        response_payroll=replace_short_names(json.loads(response_payroll),mapping)
    
    Last_Updated=redis_client.get("workforceagent_as_of_date")

        
    # print("response_payroll:",response_payroll)
    prompt=f''' You are a friendly, helpful conversational agent for inquiries related to given JSON object.
                In the JSON ,'associate' refers to my details and 'subordinate' referes to my reportees.'Time_and_absence' have details of leaveor PTO balance details in Hours and Leave balance Type.'Hybrid_work' have details of 'Hybrid Categories','Does_Worker_Adhere_to_Hybrid_Policy','Hybrid_Adherence_Period_YYYYMM' and swipe count details.
                Provide direct concise answer.Do not mention the JSON, the data source,or any reference.
                Answer as sentence.
                For queries related to hybrid work, time and absence, or compensation, include the latest data timestamp using the format:
                "As of [Mon dd, YYYY at HH:MM AM/PM], [response]".
                You may place the timestamp either at the beginning or the end of your response—choose what makes the answer clearer and more natural based on length and context.
                If the user's query cannot be fully answered using the available JSON, acknowledge the limitation politely and offer a helpful next step. If appropriate, suggest checking with their manager or, only when clearly needed, mention that a live support agent may be able to assist further. Use varied, empathetic phrasing. Do not mention “live agent” unless necessary.
                Note:
                * Adapt your response format to the user's query:
                * Single-line responses: Use plain text for simple answers.
                * Lists: Use bullet points (*) for lists of items.
                * Steps: Use numbered steps or bullet points with sequential information.
                * Emphasis: Use bold text (**text**) for important keywords or phrases.
                * New lines: Use new lines for better readability when necessary.
                * Prioritize clarity and brevity. Choose the most appropriate format to effectively convey the information.
                Here is the JSON: {response_payroll}.
                Given JSON as of date: {Last_Updated}
                -To give you an accurate answer, please review the earlier messages.'''
    return {"prompt": prompt,"end_point": "/v2/text/chats","pre_task":"get_payrollhr"}

def store_payrollhr(domainid):
    print('store_payrollhr')

    response_payroll=redis_client.hget(f"in_demographicinfo:{domainid}", "data")
    # print(response_payroll)

    if response_payroll is None:
        store_associateinfo(str(domainid))        
        response_payroll=redis_client.hget(f"in_demographicinfo:{domainid}", "data")
        
    if response_payroll:
        response_payroll=json.loads(response_payroll)

    hybrid=redis_client.hget("hybrid_info",domainid)
    # print("hybrid:",hybrid)
    timeandabsence=redis_client.hget("time_and_absence",domainid)
    compensation=redis_client.hget("compensation_info",domainid)
    sub=response_payroll.get('subordinates','[]')  
    print(sub)
    print(type(sub))
    if isinstance(sub, str):
        try:
            sub = json.loads(sub)
        except json.JSONDecodeError:
            sub = []  # fallback if string is not valid JSON
    elif isinstance(sub, list):
        pass  # already a list, no need to change
    else:
        sub = []  # fallback for unexpected types

    if hybrid is not None:
        hybrid_data=json.loads(hybrid)
        response_payroll['associate'].update(hybrid_data)
    if timeandabsence is not None:
        taa_data=json.loads(timeandabsence)
        response_payroll['associate'].update(taa_data)
    if compensation is not None:
        comp_data=json.loads(compensation)
        response_payroll['associate'].update(comp_data)

    if sub:
        for i in sub:
            hybrid=redis_client.hget("hybrid_info",str(i['DI']))
            timeandabsence=redis_client.hget("time_and_absence",str(i['DI']))
            compensation=redis_client.hget("compensation_info",str(i['DI']))

            if hybrid is not None:
                hybrid_data=json.loads(hybrid)
                i.update(hybrid_data)
            if timeandabsence is not None:
                taa_data=json.loads(timeandabsence)
                i.update(taa_data)
            if compensation is not None:
                comp_data=json.loads(compensation)
                i.update(comp_data)
        response_payroll['subordinates']=sub
    redis_client.hset(f"in_payrollinfo:{domainid}", "data", json.dumps(response_payroll))
    redis_client.expire(f"in_payrollinfo:{domainid}", 900)
    return response_payroll


