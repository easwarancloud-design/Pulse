#spanish language added

from langgraph.graph import StateGraph, END,START
from typing import List, Dict, Any
from typing_extensions import TypedDict
from modules.workflow_utils import gettoken,get_statetoken,replace_short_names,get_workday_message_et
import requests
import ast
import json
from datetime import date
from modules.agent_dbs import redis_client
from modules.agent_state import AgentState,mapping
from Tasks.Workday.associate_info import get_employeeinfo
from Tasks.Workday.payroll_hr import get_payrollhr,store_payrollhr
from Tasks.Workday.email_update import update_email
from Tasks.Servicenow.hr_policy import get_hrpolicy
import logging

logger = logging.getLogger("workforceagent")

def do_something():
    logger.info("Doing something important in utils.py")

#agentic router
# url = "https://api.horizon.elevancehealth.com/v2/document/chats"
url = "https://api.horizon.elevancehealth.com"
headers = {'Content-Type': 'application/json',}


# Define function to determine the task from user input
def classify_task(state):
    user_query = state["query"]
    language=state["language"]
    end_point="/v2/text/chats"
    token=get_statetoken(state["domainid"])
    headers['domainID']= state["domainid"]
    headers['Authorization'] = f'Bearer {token}'

    # logger.info("state chat_history",state["chat_history"])
    payload = json.dumps({
                "messages": [
                {
                "content": f'''
                You are an intelligent task router. Analyze the following user query to:
                1. Determine the appropriate task.
                2. Extract relevant input parameters.
                3. Respond with the task name and extracted parameters only (JSON format). Do not add extra words or explanations.
               
                ** Before selecting a task, scan the entire query and prompt for multiple task-relevant signals.**

                - If the query contains multiple distinct intents that map to different task categories, route to `"get_MultiTask"`.

                - Do not stop at the first match. Evaluate the full query for all possible task matches.

                Use chat history context to guide your decision:
                - If the current query is vague, implicit, or appears to be a follow-up, analyze `chat_history` to infer task intent.
                - Prioritize continuity—inherit the last clearly completed task unless the query suggests a shift in topic.
                - Typical follow-up cues may include: pronouns ("it", "that", "what about him"), time/amount queries ("when", "how much"), vague references ("still active?", "did it change?").
                                
                **Tasks:**

                1.  **get_EmployeeInfo**:
                    * Route for requests about basic employee details (individuals, managers, reportees)  or if the user says "Hi" or "Hello".
                    * Parameters: Domain ID, Worker Type, Last Name, First Name, Middle Name,Address,Birthdays,Work Anniversaries, Company Name, Department Name, Email ID, Phone Number, ManagerID, Manager Email, Manager Legal Last Name, Manager Legal First Name, Manager Legal Middle Name, Manager Company Name, Manager Department Name, Business Title, Employee Type, Contingent Worker Type, Contingent Worker Supplier, Job Family, Position, Work Location Description, Work Location Address City, Work Location Address State or Province, Work Location Postal Code, Work Location Address Country, Hire Date, cost center, FTE percentage, super org or supervisory organization.
                    * Do **not** route to `get_EmployeeInfo` if the query involves **actions, rules, or procedures** related to managing direct reports (e.g., issuing warnings, performance reviews).
                    * Flags:
                    - If asking about direct reports → `"subordinate": "yes"`
                    - If asking about birthdays → `"include_birthdays": "yes"`
                    - If asking about work anniversaries or related phrases → `"include_anniversaries": "yes"`
                    - If asking about time in current position or job profile → `"include_job_profile_duration": "yes"`

                    Alternate phrases for work anniversaries:
                    - "tenure"
                    - "how long with the company"
                    - "employment duration"
                    - "years of service"
                    - "date of joining"
                    - "when did I join"
                    - "hire date"

                    Alternate phrases for time in job profile:
                    - "time in current position"
                    - "duration in current role"
                    - "how long in current job"
                    - "tenure in current title"
                    - "time in current role"
                    - "job profile duration"
                    - "how long in this position"
                    - "who's been in their role the longest"

                    * **OUTPUT FORMAT: JSON**
                        ```json
                        {{
                        "Task": "get_EmployeeInfo",
                        "subordinate": "yes" or "no",
                        "include_birthdays": "yes" or "no",
                        "include_anniversaries": "yes" or "no",
                        "include_job_profile_duration": "yes" or "no"
                        }}
                        ```

                2.  **get_PayrollHR**:
                    * Route **only** for requests about:
                        * Compensation (basePay, targetBonusPct, bonuses, Compensation Grade),payroll.
                        * **Leave balance inquiries** or **assigned leave types** for: 'PTO', 'Sick', 'Wellness Days Off', 'PTO USA PR', 'Sick USA PR' — including questions like:
                            - "What type of leave am I enrolled in?"
                            - "Do I have PTO or Sick Leave?"
                            - "Which leave types apply to me?"
                        * Swipe count details (attendance).
                        * **Associate-specific** Hybrid Categories, Hybrid Adherence Period.
                        * **Associate-specific** adherence to Hybrid Policy/complaint ('Yes', 'No', 'Not Applicable').
                    * Parameters for leave balance: The specific leave type requested. Parameters for hybrid details would relate to identifying the associate (name, ID).
                    * **OUTPUT FORMAT: JSON**
                        ```json
                        {{
                        "Task": "get_PayrollHR",
                        "leave_type": "<extract leave type if balance is requested>" or "None",
                        "name": "<extract associate name for hybrid details>" or "None",
                        "ID": "<extract associate ID for hybrid details>" or "None"
                        }}
                        ```
                3.  **get_HRPolicy**:
                    * Route for general company policies, HR guidelines, or any documents related questions. This includes general questions about the "hybrid policy", **types of leave policies and their explanations**, etc.
                    * Includes topics like hybrid work rules, leave types and eligibility, timesheet corrections, onboarding/offboarding steps, and HR procedures involving Workday, ServiceNow, or Pulse—such as task submissions, profile updates, feedback workflows, and system navigation.
                    * Payroll-related **documents only** (e.g., W2 forms, pay stubs, tax forms).
                    * **Management actions or rules** involving direct reports (e.g., issuing warnings, performance reviews, escalation steps)
                    * If the query is about a **document** (regardless of topic), route here.

                    * **OUTPUT FORMAT: JSON**
                        ```json
                        {{
                        "Task": "get_HRPolicy"
                        }}
                        ```
                4. **get_LiveAgent**  
                    * Route this task if the user **clearly and explicitly requests live agent support**, using intent phrases like:
                        - "Live agent"
                        - "connect me to a live agent"
                        - "I need to talk to someone"
                        - "I want human help"
                        - "can I speak with support?"
                    * Confirmation is **not required** if the user's request is decisive.
                    * If the assistant previously offered live support and the user replies with "yes", "please connect me", or similar, treat it as confirmation.
                    * Check `chat_history` to detect confirmations even if not explicit in the current message.
                    * If confirmation is ambiguous but intent is present, set `"liveagent_confirmation": "no"`.
                      ```json
                        {{
                        "Task": "get_LiveAgent"
                        "liveagent_confirmation": "yes" <if User explicitly confirmed they want live agent support>, "no" <confirmation has not yet been provided>,
                        }}
                        ```

                5. **update_email:**
                    * Route to this task for update or modify  their personal ("personal email", "email", "home email", "contact") or  work ("work email", "office email", "business email")

                    * **OUTPUT FORMAT:JSON**
                    * `{{"Task": "update_email",
                    "email": "<extract email from question if provided>"` or "None"`
                    "can_update": "yes" <if update user "personal email", "email", "home email" >"`  "no"<if  work ("work email", "office email", "business email")>`
                    "self_update": "yes" <if user asking to update their own email> "no" <if user asking others email update>
                    }}`

                6. **get_MultiTask**:
                    * Route if the user query combines 2 or more task categories (e.g. employee info + payroll, leave balance + policy explanation,Combination of Policy +worker attributes+ Demographics,Combination of Payroll +worker attributes+ Demographics,Combination of Hybrid + Worker Attributes).
                    * Detect when multiple intents appear in a single question.
                    * **OUTPUT FORMAT: JSON**
                        ```json
                        {{
                        "Task": "get_MultiTask"
                        }}
                        ```
                
                7. **unknown**:
                    * Route if the user query is unrelated to the above tasks.
                    * Route If the user appears confused, frustrated, or uncertain—based on current message and past history—respond empathetically and offer additional support options in a natural way.
                    * **OUTPUT FORMAT: JSON**
                        ```json
                        {{
                        "Task": "unknown"
                        }}
                        ```   
                chat_history: {state["chat_history"]}

                User query: {user_query}

                Use both chat_history and current query to determine the most appropriate task. If query depends on prior context or references past assistant response, inherit the previous task unless the query clearly changes the topic. ''',
                                
                "role": "user"
                   },
                    {
                    "content": str(user_query),
                    "role": "user"
                    }
                ],
                "stream": False
                })

    response = requests.request("POST", url+end_point, headers=headers, data=payload,verify=False)

    if response.status_code==200:
        logger.info('########### clasify task ##########')        
        logger.info(response.json())

        result=response.json()["message"]["content"].strip().lower()
        result=result.replace('```json','').replace('```','').replace('`','')

        final=ast.literal_eval(result.strip())
        if final.get('liveagent_confirmation','')=='no' and final["task"]=='get_liveagent':
            return {"task": "unknown"}

        return  {"task": final["task"], "include_birthdays":final.get('include_birthdays',None),"include_anniversaries":final.get('include_anniversaries',None),"include_job_profile_duration":final.get('include_job_profile_duration',None), "email":final.get('email',None),"can_update":final.get('can_update',''),"self_update":final.get('self_update','')}

    else:
        logger.info('########### Failed clasify task ##########')
        logger.info(response.text)
        return  {"task": "unknown"}

def find_task(state):
    return state["task"]

def get_liveagent(state: AgentState):
    logger.info('Escalating to live agent...')
    return {"response": "Escalating to a live agent. Please wait..."}

def get_multitask(state: AgentState):
    logger.info('route task to unkown...')
    return {"response": "route task to unkown"}

def unknown(state: AgentState):
    domainid=str(state["domainid"])

    response_payroll=redis_client.hget(f"in_payrollinfo:{str(domainid)}", "data")

    if response_payroll is None:        
        data=store_payrollhr(str(domainid))
        response_payroll=redis_client.hget(f"in_payrollinfo:{str(domainid)}", "data")
    
    if response_payroll:        
        response_payroll=replace_short_names(json.loads(response_payroll),mapping)

    Last_Updated=get_workday_message_et()
    
    prompt=f'''You are a friendly and helpful conversational agent for human resources inquiries at Elevance Health (referred to as "the company"). Refer to company workers as "associates," not "employees." Answer using only provided documents and Provided Json. Include relevant policy steps or contact details. if user mentioned my associate that is refers to my reportees.
            In the JSON ,'associate' refers to my details and 'subordinate' referes to my reportees.'Time_and_absence' have details of leave or PTO balance details in Hours and Leave balance Type.'Hybrid_work' have details of 'Hybrid Categories','Does_Worker_Adhere_to_Hybrid_Policy','Hybrid_Adherence_Period_YYYYMM' and swipe count details.
             - if question related to given JSON as well, Choose the most natural and context-appropriate phrasing for the timestamp, such as:
                - '<i> * As of {Last_Updated} from Workday </i>'
                - '<i> * Last updated from Workday at {Last_Updated} </i>'
                - '<i> * The above data is current from Workday as of {Last_Updated} </i>'
             - Use the phrasing that best fits the tone and content of the response, but always place it at the end in italics using <i>...</i> tags and prefix it with a single-quoted asterisk (*) to indicate a note. so the UI can render it appropriately.

            Provide diriect concise answer.Do not mention the JSON, the data source,or any reference.
            Answer as sentence.
            Here is the JSON: {response_payroll}
            Follow these for policy interpretation notes:
            - PTO involves MyChoice PTO, Service Contract PTO, and Paid Time Off policies (not "different" or "general").
            - Entering Time has state-specific policies (mention all).
            - Bereavement has state-specific variations (mention all).

            Do not answer persona/complexity/length-specific requests.

            For decision/action requests, advise consulting HR/manager and offer recommendations.

            If the user's question is unclear, lacks sufficient detail, or cannot be answered using the available HR policy data, respond with a relevant clarifying follow-up—ideally based on common patterns from ServiceNow, Workday, or previous live agent interactions.
            When the conversation history suggests repeated confusion, hesitation, or unmet needs, gently offer additional support without sounding scripted. Your phrasing should feel naturally embedded within the conversation—for example:
            - “If it helps, I can point you toward someone who specializes in this.”
            - “You are welcome to reach out for direct help if you'd prefer.”
            Vary your language and tone to match the user's emotional context. Do not offer to connect with a live agent unless the situation clearly warrants it.

            If a user asks how to contact someone (e.g., an HR representative or a live support person) and documentation suggests company portal, phone, or email methods, acknowledge those—but prioritize informing them that they can also request a live support agent through this chatbot. This option is not documented but available to them here. Offer help gently, such as:
            - “I can assist further or help connect you with someone directly if you'd prefer.”
            - “Live support is available right here through this chat if you'd like me to arrange that.”

            Note: Policy links will be added later. Do not directly refer to policy documents.
'''
    # print('unkown prompt:',prompt)
    return {"prompt": prompt, "end_point":"/v2/document/chats","pre_task":"unknown"}


def generate_response(state):
    user_query = state["query"]
    chat_history=state["chat_history"]
    endpoint=state["end_point"]
    token=get_statetoken(state["domainid"])
    headers['Authorization'] = f'Bearer {token}'
    headers['domainID']= state["domainid"]
    pre_task=state["pre_task"]

    prompt=state["prompt"]
    if state['language']=='es':
        logger.info('geneate response spanish')
        prompt=str(state["prompt"])+"Note: convert response text to Spanish language."
    messages=[{"content":prompt  ,"role": "system"}]
    messages.extend(chat_history)
    messages.append({"content": user_query,"role": "user"})


    payload = json.dumps({
                "messages": messages,
                "stream": True
                })

    return {"response":{"headers":headers, "data":payload, "url": url+endpoint,"task":pre_task}}

# Define LangGraph workflow
workflow = StateGraph(AgentState)
workflow.add_node("classify_task", classify_task)
workflow.add_node("find_task", find_task)
workflow.add_node("get_employeeinfo",  get_employeeinfo)
workflow.add_node("get_hrpolicy",  get_hrpolicy)
workflow.add_node("get_payrollhr",  get_payrollhr)
workflow.add_node("get_liveagent",  get_liveagent)
workflow.add_node("update_email",  update_email)
workflow.add_node("unknown", unknown)
workflow.add_node("get_multitask", get_multitask)
workflow.add_node("generate_response", generate_response)


# workflow.set_entry_point("classify_task")
workflow.add_edge(START, "classify_task")
workflow.add_conditional_edges("classify_task",find_task)
workflow.add_edge("get_employeeinfo", "generate_response")
workflow.add_edge("get_payrollhr", "generate_response")
workflow.add_edge("get_hrpolicy", "generate_response")
workflow.add_edge("update_email", "generate_response")
workflow.add_edge("get_multitask", "unknown")
workflow.add_edge("unknown", "generate_response")
workflow.add_edge("generate_response", END)
workflow.add_edge("get_liveagent", END)
