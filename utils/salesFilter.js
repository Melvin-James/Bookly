function getFilterQuery(filter, from, to){
    const today = new Date();
    let startDate, endDate;

    if(filter === 'daily'){
        startDate = new Date(today.setHours(0,0,0,0));
        endDate = new Date(today.setHours(23,59,59,999));
    }else if(filter === 'weekly'){
        const firstDayOfWeek = new Date(today.setDate(today.getDate()-today.getDay()));
        startDate=new Date(firstDayOfWeek.setHours(0,0,0,0));
        endDate = new Date();
    }else if(filter === 'monthly'){
        startDate = new Date(today.getFullYear(), today.getMonth(),1);
        endDate=new Date();
    }
    else if(filter === 'custom' && from && to){
        startDate = new Date(from);
        endDate=new Date(to);
        endDate.setHours(23,59,59,999);
    }
const query = {status:'Delivered'};

if(startDate && endDate){
    query.createdAt = { $gte:startDate, $lte:endDate};
}

return query;

}

module.exports=getFilterQuery;